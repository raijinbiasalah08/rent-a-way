const express = require("express");
const { randomUUID: uuidv4 } = require("node:crypto");
const db = require("../db/database");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Get all favorites for the logged in user
router.get("/", authenticate, async (req, res) => {
  try {
    const favorites = await db
      .prepare(
        `
      SELECT f.product_id, p.*,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      WHERE f.user_id = ? AND p.is_active = 1
      ORDER BY f.created_at DESC
    `,
      )
      .all(req.user.id);

    // To make it easy to just get IDs for the UI toggles
    const ids = favorites.map((f) => f.product_id);

    res.json({ success: true, data: { items: favorites, ids } });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// Add a product to favorites
router.post("/:productId", authenticate, async (req, res) => {
  try {
    if (
      !(await db
        .prepare("SELECT id FROM products WHERE id = ? AND is_active = 1")
        .get(req.params.productId))
    )
      return res
        .status(404)
        .json({ success: false, message: "Equipment not found" });
    const exists = await db
      .prepare("SELECT id FROM favorites WHERE user_id = ? AND product_id = ?")
      .get(req.user.id, req.params.productId);
    if (!exists) {
      await db
        .prepare(
          `
        INSERT INTO favorites (id, user_id, product_id, created_at)
        VALUES (?, ?, ?, ?) ON CONFLICT(user_id, product_id) DO NOTHING
      `,
        )
        .run(
          uuidv4(),
          req.user.id,
          req.params.productId,
          new Date().toISOString(),
        );
    }
    res.json({ success: true, message: "Added to favorites" });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// Remove a product from favorites
router.delete("/:productId", authenticate, async (req, res) => {
  try {
    await db
      .prepare("DELETE FROM favorites WHERE user_id = ? AND product_id = ?")
      .run(req.user.id, req.params.productId);
    res.json({ success: true, message: "Removed from favorites" });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

module.exports = router;
