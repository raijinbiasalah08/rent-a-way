const express = require("express");
const { randomUUID: uuidv4 } = require("node:crypto");
const db = require("../db/database");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let { type, page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (page - 1) * limit;

    let query =
      "SELECT c.*, u.name as author_name, u.avatar as author_avatar FROM community_posts c JOIN users u ON c.user_id = u.id";
    let countQuery = "SELECT COUNT(*) as total FROM community_posts c";
    const params = [];

    if (type) {
      query += " WHERE c.type = ?";
      countQuery += " WHERE c.type = ?";
      params.push(type);
    }

    query += " ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
    const posts = await db.prepare(query).all(...params, limit, offset);
    const { total } = await db.prepare(countQuery).get(...params);

    res.json({
      success: true,
      data: { posts, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const { content, type = "experience" } = req.body;
    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 5000 ||
      !["experience", "question", "tip"].includes(type)
    )
      return res.status(400).json({
        success: false,
        message: "Enter a post up to 5,000 characters and choose a valid type",
      });

    const id = uuidv4();
    await db
      .prepare(
        `
      INSERT INTO community_posts (id, user_id, content, type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(id, req.user.id, content, type, new Date().toISOString());

    const post = await db
      .prepare(
        "SELECT c.*, u.name as author_name, u.avatar as author_avatar FROM community_posts c JOIN users u ON c.user_id = u.id WHERE c.id = ?",
      )
      .get(id);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.put("/:id/like", authenticate, async (req, res) => {
  try {
    const post = await db.transaction(async () => {
      const exists = await db
        .prepare(
          `SELECT id FROM community_posts WHERE id = ?${db.dialect === "postgres" ? " FOR UPDATE" : ""}`,
        )
        .get(req.params.id);
      if (!exists) return null;
      const liked = await db
        .prepare(
          "SELECT user_id FROM community_likes WHERE post_id = ? AND user_id = ?",
        )
        .get(req.params.id, req.user.id);
      if (liked)
        await db
          .prepare(
            "DELETE FROM community_likes WHERE post_id = ? AND user_id = ?",
          )
          .run(req.params.id, req.user.id);
      else
        await db
          .prepare("INSERT INTO community_likes (post_id,user_id) VALUES (?,?)")
          .run(req.params.id, req.user.id);
      const { likes } = await db
        .prepare(
          "SELECT COUNT(*) AS likes FROM community_likes WHERE post_id = ?",
        )
        .get(req.params.id);
      await db
        .prepare("UPDATE community_posts SET likes = ? WHERE id = ?")
        .run(likes, req.params.id);
      return { likes, liked: !liked };
    });
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    res.json({ success: true, data: post });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

module.exports = router;
