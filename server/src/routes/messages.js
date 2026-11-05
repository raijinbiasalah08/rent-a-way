const express = require("express");
const multer = require("multer");
const { randomUUID: uuidv4 } = require("node:crypto");
const db = require("../db/database");
const { authenticate } = require("../middleware/auth");
const uploadsDir = require("../utils/uploads");
const socket = require("../socket");

const router = express.Router();

// ── Image upload for chat ────────────────────────────────────────────────────
const upload = require("../utils/imageStorage");
async function validateRecipient(req, res, next) {
  const id = req.body.receiver_id;
  const user =
    typeof id === "string" &&
    (await db
      .prepare("SELECT id FROM users WHERE id = ? AND is_active = 1")
      .get(id));
  if (!user || id === req.user.id)
    return res
      .status(400)
      .json({ success: false, message: "Choose a valid recipient" });
  const blocked = await db
    .prepare(
      "SELECT id FROM blocked_users WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)",
    )
    .get(req.user.id, id, id, req.user.id);
  if (blocked)
    return res
      .status(403)
      .json({ success: false, message: "This conversation is blocked" });
  if (req.body.reply_to_id) {
    const parent = await db
      .prepare(
        "SELECT id,content FROM messages WHERE id = ? AND ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?))",
      )
      .get(req.body.reply_to_id, req.user.id, id, id, req.user.id);
    if (!parent)
      return res.status(400).json({ success: false, message: "Invalid reply" });
    req.body.reply_preview = parent.content.slice(0, 200);
  } else req.body.reply_preview = null;
  if (
    req.body.product_id &&
    !(await db
      .prepare("SELECT id FROM products WHERE id = ? AND is_active = 1")
      .get(req.body.product_id))
  )
    return res.status(400).json({ success: false, message: "Invalid listing" });
  next();
}

// ── Helper: emit socket event safely ────────────────────────────────────────
function emit(userId, event, data) {
  try {
    const io = socket.getIO();
    const sid = socket.getUserSocketId(userId);
    if (sid) io.to(sid).emit(event, data);
  } catch (e) {
    /* socket not ready */
  }
}

// ── GET /conversations ───────────────────────────────────────────────────────
router.get("/conversations", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await db
      .prepare(
        `
      SELECT
        u.id as other_user_id, u.name, u.avatar, u.role,
        MAX(m.created_at) as last_message_time,
        SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) as unread_count,
        (SELECT content FROM messages
         WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT type FROM messages
         WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1) as last_message_type
      FROM messages m
      JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id) AND u.id != ?
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
        AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
        AND ? NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = u.id)
      GROUP BY u.id
      ORDER BY last_message_time DESC
    `,
      )
      .all(
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
      );

    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// ── GET /:otherUserId — fetch messages + mark as read ────────────────────────
router.get("/:otherUserId", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.otherUserId;

    // Check if either user has blocked the other
    const isBlocked = await db
      .prepare(
        `
      SELECT id FROM blocked_users
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
    `,
      )
      .get(userId, otherId, otherId, userId);

    if (isBlocked)
      return res.json({
        success: true,
        data: [],
        blocked: true,
        hasMore: false,
      });
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const before =
      typeof req.query.before === "string"
        ? await db
            .prepare(
              "SELECT created_at,id FROM messages WHERE id = ? AND ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?))",
            )
            .get(req.query.before, userId, otherId, otherId, userId)
        : null;
    if (req.query.before && !before)
      return res
        .status(400)
        .json({ success: false, message: "Invalid conversation cursor" });
    // Mark messages as read + record read_at timestamp
    const now = new Date().toISOString();
    await db
      .prepare(
        `
      UPDATE messages SET is_read = 1, read_at = ?
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `,
      )
      .run(now, otherId, userId);

    // Notify sender their messages were read
    emit(otherId, "messages_read", { readerId: userId, readAt: now });

    const messages = await db
      .prepare(
        `
      SELECT * FROM messages
      WHERE ((sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?))
      ${before ? "AND (created_at < ? OR (created_at = ? AND id < ?))" : ""}
      ORDER BY created_at DESC,id DESC LIMIT ?
    `,
      )
      .all(
        userId,
        otherId,
        otherId,
        userId,
        ...(before ? [before.created_at, before.created_at, before.id] : []),
        limit + 1,
      );

    res.json({
      success: true,
      data: messages.slice(0, limit).reverse(),
      blocked: false,
      hasMore: messages.length > limit,
    });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// ── POST / — send a text message ─────────────────────────────────────────────
router.post("/", authenticate, validateRecipient, async (req, res) => {
  try {
    const {
      receiver_id,
      product_id,
      content,
      reply_to_id,
      reply_preview,
      type = "text",
    } = req.body;
    if (
      type !== "text" ||
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 5000
    )
      return res.status(400).json({
        success: false,
        message: "Enter a message up to 5,000 characters",
      });
    if (!receiver_id || (!content && type === "text")) {
      return res
        .status(400)
        .json({ success: false, message: "Receiver and content required" });
    }

    // Block check
    const isBlocked = await db
      .prepare(
        `
      SELECT id FROM blocked_users
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
    `,
      )
      .get(req.user.id, receiver_id, receiver_id, req.user.id);
    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Cannot send message — user is blocked.",
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const isOnline = socket.isUserOnline(receiver_id);
    const delivered_at = isOnline ? now : null;

    await db
      .prepare(
        `
      INSERT INTO messages (id, sender_id, receiver_id, product_id, content, type, reply_to_id, reply_preview, delivered_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        id,
        req.user.id,
        receiver_id,
        product_id || null,
        content,
        type,
        reply_to_id || null,
        reply_preview || null,
        delivered_at,
        now,
      );

    // Notification
    const senderName =
      (await db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id))
        ?.name || "Someone";
    const notifId = uuidv4();
    await db
      .prepare(
        `
      INSERT INTO notifications (id, user_id, title, message, link, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        notifId,
        receiver_id,
        "New Message",
        `New message from ${senderName}`,
        "/messages",
        now,
      );

    const message = await db
      .prepare("SELECT * FROM messages WHERE id = ?")
      .get(id);
    emit(receiver_id, "new_message", message);
    const notif = await db
      .prepare("SELECT * FROM notifications WHERE id = ?")
      .get(notifId);
    emit(receiver_id, "new_notification", notif);

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// ── POST /image — send an image in chat ──────────────────────────────────────
router.post(
  "/image",
  authenticate,
  upload.single("image"),
  validateRecipient,
  async (req, res) => {
    try {
      const { receiver_id, reply_to_id, reply_preview } = req.body;
      if (!receiver_id)
        return res
          .status(400)
          .json({ success: false, message: "receiver_id required" });
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "Image file required" });

      const isBlocked = await db
        .prepare(
          `
      SELECT id FROM blocked_users WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)
    `,
        )
        .get(req.user.id, receiver_id, receiver_id, req.user.id);
      if (isBlocked)
        return res
          .status(403)
          .json({ success: false, message: "User is blocked." });

      const id = uuidv4();
      const now = new Date().toISOString();
      const imageUrl = req.file.url;
      const isOnline = socket.isUserOnline(receiver_id);
      const delivered_at = isOnline ? now : null;

      await db
        .prepare(
          `
      INSERT INTO messages (id, sender_id, receiver_id, content, type, image_url, reply_to_id, reply_preview, delivered_at, created_at)
      VALUES (?, ?, ?, ?, 'image', ?, ?, ?, ?, ?)
    `,
        )
        .run(
          id,
          req.user.id,
          receiver_id,
          "📷 Image",
          imageUrl,
          reply_to_id || null,
          reply_preview || null,
          delivered_at,
          now,
        );

      const message = await db
        .prepare("SELECT * FROM messages WHERE id = ?")
        .get(id);
      emit(receiver_id, "new_message", message);
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      console.error({ route: req.originalUrl, code: error.code || error.name });
      res.status(500).json({
        success: false,
        message: "Unable to complete the request. Please try again.",
      });
    }
  },
);

// ── POST /equipment — share an equipment card ─────────────────────────────────
router.post("/equipment", authenticate, validateRecipient, async (req, res) => {
  try {
    const { receiver_id, equipment_id } = req.body;
    if (!receiver_id || !equipment_id) {
      return res.status(400).json({
        success: false,
        message: "receiver_id and equipment_id required",
      });
    }

    const isBlocked = await db
      .prepare(
        `
      SELECT id FROM blocked_users WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)
    `,
      )
      .get(req.user.id, receiver_id, receiver_id, req.user.id);
    if (isBlocked)
      return res
        .status(403)
        .json({ success: false, message: "User is blocked." });

    // Fetch equipment data to embed in the message
    const equipment = await db
      .prepare(
        `
      SELECT p.id, p.title, p.price_per_day, p.availability, p.barangay, p.location,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p WHERE p.id = ? AND p.is_active = 1
    `,
      )
      .get(equipment_id);
    if (!equipment)
      return res
        .status(404)
        .json({ success: false, message: "Equipment not found" });

    const id = uuidv4();
    const now = new Date().toISOString();
    const isOnline = socket.isUserOnline(receiver_id);

    await db
      .prepare(
        `
      INSERT INTO messages (id, sender_id, receiver_id, content, type, equipment_id, equipment_data, delivered_at, created_at)
      VALUES (?, ?, ?, ?, 'equipment_card', ?, ?, ?, ?)
    `,
      )
      .run(
        id,
        req.user.id,
        receiver_id,
        `📦 ${equipment.title}`,
        equipment_id,
        JSON.stringify(equipment),
        isOnline ? now : null,
        now,
      );

    const message = await db
      .prepare("SELECT * FROM messages WHERE id = ?")
      .get(id);
    emit(receiver_id, "new_message", message);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// ── POST /location — share location ──────────────────────────────────────────
router.post("/location", authenticate, validateRecipient, async (req, res) => {
  try {
    const { receiver_id, location_lat, location_lng, location_label } =
      req.body;
    if (
      !Number.isFinite(Number(location_lat)) ||
      !Number.isFinite(Number(location_lng)) ||
      Math.abs(Number(location_lat)) > 90 ||
      Math.abs(Number(location_lng)) > 180
    )
      return res
        .status(400)
        .json({ success: false, message: "Invalid coordinates" });
    if (!receiver_id || !location_lat || !location_lng) {
      return res
        .status(400)
        .json({ success: false, message: "receiver_id, lat, lng required" });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const isOnline = socket.isUserOnline(receiver_id);

    await db
      .prepare(
        `
      INSERT INTO messages (id, sender_id, receiver_id, content, type, location_lat, location_lng, location_label, delivered_at, created_at)
      VALUES (?, ?, ?, ?, 'location', ?, ?, ?, ?, ?)
    `,
      )
      .run(
        id,
        req.user.id,
        receiver_id,
        "📍 Location",
        location_lat,
        location_lng,
        location_label || "",
        isOnline ? now : null,
        now,
      );

    const message = await db
      .prepare("SELECT * FROM messages WHERE id = ?")
      .get(id);
    emit(receiver_id, "new_message", message);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// ── GET /search/conversations — search across messages ───────────────────────
router.get("/search/conversations", authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;
    if (!q || !q.trim()) return res.json({ success: true, data: [] });

    const term = `%${q.trim()}%`;
    const results = await db
      .prepare(
        `
      SELECT DISTINCT
        u.id as other_user_id, u.name, u.avatar, u.role,
        m.content as match_content, m.created_at as match_time
      FROM messages m
      JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id) AND u.id != ?
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
        AND (m.content LIKE ? OR u.name LIKE ?)
      ORDER BY m.created_at DESC
      LIMIT 20
    `,
      )
      .all(userId, userId, userId, term, term);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// ── POST /block — block a user ───────────────────────────────────────────────
router.post("/block", authenticate, async (req, res) => {
  try {
    const { blocked_id, reason } = req.body;
    if (
      blocked_id === req.user.id ||
      !(await db.prepare("SELECT id FROM users WHERE id = ?").get(blocked_id))
    )
      return res.status(400).json({ success: false, message: "Invalid user" });
    if (!blocked_id)
      return res
        .status(400)
        .json({ success: false, message: "blocked_id required" });
    const id = uuidv4();
    await db
      .prepare(
        `
      INSERT INTO blocked_users (id, blocker_id, blocked_id, reason, created_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(blocker_id, blocked_id) DO UPDATE SET reason = excluded.reason
    `,
      )
      .run(
        id,
        req.user.id,
        blocked_id,
        reason || null,
        new Date().toISOString(),
      );
    res.json({ success: true, message: "User blocked." });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// ── DELETE /block/:userId — unblock a user ───────────────────────────────────
router.delete("/block/:userId", authenticate, async (req, res) => {
  try {
    await db
      .prepare(
        "DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?",
      )
      .run(req.user.id, req.params.userId);
    res.json({ success: true, message: "User unblocked." });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// ── GET /block/status/:userId — check block status ──────────────────────────
router.get("/block/status/:userId", authenticate, async (req, res) => {
  try {
    const iBlockedThem = !!(await db
      .prepare(
        "SELECT id FROM blocked_users WHERE blocker_id=? AND blocked_id=?",
      )
      .get(req.user.id, req.params.userId));
    const theyBlockedMe = !!(await db
      .prepare(
        "SELECT id FROM blocked_users WHERE blocker_id=? AND blocked_id=?",
      )
      .get(req.params.userId, req.user.id));
    res.json({ success: true, data: { iBlockedThem, theyBlockedMe } });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// ── PUT /deliver/:messageId — mark a message as delivered ───────────────────
router.put("/deliver/:messageId", authenticate, async (req, res) => {
  try {
    const message = await db
      .prepare(
        "SELECT sender_id FROM messages WHERE id = ? AND receiver_id = ?",
      )
      .get(req.params.messageId, req.user.id);
    if (!message)
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    const blocked = await db
      .prepare(
        "SELECT id FROM blocked_users WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)",
      )
      .get(req.user.id, message.sender_id, message.sender_id, req.user.id);
    if (blocked)
      return res
        .status(403)
        .json({ success: false, message: "This conversation is blocked" });
    const now = new Date().toISOString();
    const result = await db
      .prepare(
        "UPDATE messages SET delivered_at = ? WHERE id = ? AND receiver_id = ? AND delivered_at IS NULL",
      )
      .run(now, req.params.messageId, req.user.id);
    if (!result.changes)
      return res.status(404).json({
        success: false,
        message: "Message not found or already delivered",
      });
    res.json({ success: true });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

module.exports = router;
