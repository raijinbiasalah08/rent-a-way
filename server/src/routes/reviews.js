const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage });

router.get('/product/:productId', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.productId);
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticate, authorize('customer'), upload.single('image'), (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    if (!product_id || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Invalid product or rating' });
    }

    const pastRental = db.prepare(`
      SELECT id FROM rentals 
      WHERE product_id = ? AND customer_id = ? AND status IN ('completed', 'returned')
      LIMIT 1
    `).get(product_id, req.user.id);

    if (!pastRental) {
      return res.status(403).json({ success: false, message: 'You can only review products you have rented and returned' });
    }

    const id = uuidv4();
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(`
      INSERT INTO reviews (id, product_id, customer_id, rating, comment, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, product_id, req.user.id, rating, comment, imageUrl, new Date().toISOString());

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
