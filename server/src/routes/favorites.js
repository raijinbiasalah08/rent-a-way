const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all favorites for the logged in user
router.get('/', authenticate, (req, res) => {
  try {
    const favorites = db.prepare(`
      SELECT f.product_id, p.*,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      WHERE f.user_id = ? AND p.is_active = 1
      ORDER BY f.created_at DESC
    `).all(req.user.id);

    // To make it easy to just get IDs for the UI toggles
    const ids = favorites.map(f => f.product_id);

    res.json({ success: true, data: { items: favorites, ids } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a product to favorites
router.post('/:productId', authenticate, (req, res) => {
  try {
    const exists = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(req.user.id, req.params.productId);
    if (!exists) {
      db.prepare(`
        INSERT INTO favorites (id, user_id, product_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), req.user.id, req.params.productId, new Date().toISOString());
    }
    res.json({ success: true, message: 'Added to favorites' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove a product from favorites
router.delete('/:productId', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
