const express = require("express");
const { randomUUID: uuidv4 } = require("node:crypto");
const db = require("../db/database");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Get all notifications for logged in user
router.get("/", authenticate, async (req, res) => {
  try {
    const page = Math.min(100000, Math.max(1, parseInt(req.query.page) || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const notifications = await db
      .prepare(
        `
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(req.user.id, limit + 1, (page - 1) * limit);

    const unreadCount = (
      await db
        .prepare(
          "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
        )
        .get(req.user.id)
    ).count;

    res.json({
      success: true,
      data: {
        notifications: notifications.slice(0, limit),
        unreadCount,
        hasMore: notifications.length > limit,
        page,
      },
    });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// Mark one notification as read
router.put("/:id/read", authenticate, async (req, res) => {
  try {
    await db
      .prepare(
        "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      )
      .run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// Mark all as read
router.put("/read-all", authenticate, async (req, res) => {
  try {
    await db
      .prepare(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      )
      .run(req.user.id);
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
