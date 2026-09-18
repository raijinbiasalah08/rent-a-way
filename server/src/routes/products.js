const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage });

router.get('/', (req, res) => {
  try {
    let { search, category, minPrice, maxPrice, availability, page = 1, limit = 12 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let query = 'SELECT p.*, u.name as supplier_name, (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image, (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating FROM products p JOIN users u ON p.supplier_id = u.id WHERE p.is_active = 1';
    let countQuery = 'SELECT COUNT(*) as total FROM products p WHERE p.is_active = 1';
    const params = [];

    if (search) {
      query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      countQuery += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      query += ' AND p.category = ?';
      countQuery += ' AND p.category = ?';
      params.push(category);
    }
    if (minPrice) {
      query += ' AND p.price_per_day >= ?';
      countQuery += ' AND p.price_per_day >= ?';
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ' AND p.price_per_day <= ?';
      countQuery += ' AND p.price_per_day <= ?';
      params.push(maxPrice);
    }
    if (availability) {
      query += ' AND p.availability = ?';
      countQuery += ' AND p.availability = ?';
      params.push(availability);
    }

    query += ' LIMIT ? OFFSET ?';
    
    const products = db.prepare(query).all(...params, limit, offset);
    const { total } = db.prepare(countQuery).get(...params);

    res.json({
      success: true,
      data: {
        products,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/categories', (req, res) => {
  try {
    const categories = ['Cameras', 'Camping', 'Sports', 'Event', 'Household', 'School'];
    const counts = db.prepare('SELECT category, COUNT(*) as count FROM products WHERE is_active = 1 GROUP BY category').all();
    const result = categories.map(cat => {
      const found = counts.find(c => c.category === cat);
      return { name: cat, count: found ? found.count : 0 };
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Supplier's own listings
router.get('/mine', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count
      FROM products p
      WHERE p.supplier_id = ? AND p.is_active = 1
      ORDER BY p.created_at DESC
    `).all(req.user.id);
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, u.name as supplier_name, u.avatar as supplier_avatar,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count
      FROM products p 
      JOIN users u ON p.supplier_id = u.id 
      WHERE p.id = ? AND p.is_active = 1
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(product.id);
    product.images = images;

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticate, authorize('supplier'), (req, res) => {
  try {
    const { title, description, category, price_per_day, min_days, max_days, specs } = req.body;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO products (id, supplier_id, title, description, category, price_per_day, min_days, max_days, specs, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title, description, category, price_per_day, min_days, max_days, specs, new Date().toISOString());
    
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const { title, description, category, price_per_day, min_days, max_days, specs, availability } = req.body;
    const product = db.prepare('SELECT supplier_id FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (req.user.role !== 'admin' && product.supplier_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    db.prepare(`
      UPDATE products SET title = ?, description = ?, category = ?, price_per_day = ?, min_days = ?, max_days = ?, specs = ?, availability = ?
      WHERE id = ?
    `).run(title, description, category, price_per_day, min_days, max_days, specs, availability, req.params.id);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const product = db.prepare('SELECT supplier_id FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (req.user.role !== 'admin' && product.supplier_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/images', authenticate, authorize('supplier', 'admin'), upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image provided' });
    const product = db.prepare('SELECT supplier_id FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (req.user.role !== 'admin' && product.supplier_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const imageId = uuidv4();
    const url = `/uploads/${req.file.filename}`;
    const isPrimary = db.prepare('SELECT count(*) as c FROM product_images WHERE product_id = ?').get(req.params.id).c === 0 ? 1 : 0;
    
    db.prepare('INSERT INTO product_images (id, product_id, url, is_primary) VALUES (?, ?, ?, ?)').run(imageId, req.params.id, url, isPrimary);
    res.json({ success: true, data: { id: imageId, url, is_primary: isPrimary } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id/images/:imageId', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const product = db.prepare('SELECT supplier_id FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (req.user.role !== 'admin' && product.supplier_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    db.prepare('DELETE FROM product_images WHERE id = ? AND product_id = ?').run(req.params.imageId, req.params.id);
    res.json({ success: true, message: 'Image removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
