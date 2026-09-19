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
    let { search, category, minPrice, maxPrice, availability, startDate, endDate, minLat, maxLat, minLng, maxLng, page = 1, limit = 12 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let query = `SELECT p.*, u.name as supplier_name, 
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image, 
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      ((SELECT COUNT(*) FROM rentals r2 JOIN products p2 ON r2.product_id = p2.id WHERE p2.supplier_id = u.id AND r2.status IN ('completed', 'returned')) >= 5 
       AND 
       (SELECT AVG(rating) FROM reviews rev JOIN products p3 ON rev.product_id = p3.id WHERE p3.supplier_id = u.id) >= 4.8) as is_super_supplier
      FROM products p JOIN users u ON p.supplier_id = u.id `;
    let countQuery = 'SELECT COUNT(*) as total FROM products p ';

    if (search) {
      query += ' JOIN products_fts fts ON p.rowid = fts.rowid ';
      countQuery += ' JOIN products_fts fts ON p.rowid = fts.rowid ';
    }
    
    query += ' WHERE p.is_active = 1';
    countQuery += ' WHERE p.is_active = 1';
    
    const params = [];

    if (search) {
      // FTS5 prefix matching syntax
      const sanitizedSearch = search.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\\s+/).map(word => `${word}*`).join(' ');
      query += ' AND products_fts MATCH ?';
      countQuery += ' AND products_fts MATCH ?';
      params.push(sanitizedSearch);
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
    if (startDate && endDate) {
      const dateFilter = ` AND p.id NOT IN (
        SELECT product_id FROM rentals
        WHERE status IN ('approved', 'active')
        AND (start_date <= ? AND end_date >= ?)
      )`;
      query += dateFilter;
      countQuery += dateFilter;
      params.push(endDate, startDate);
    }
    
    // Bounding Box filtering for maps
    if (minLat && maxLat && minLng && maxLng) {
      const geoFilter = ' AND p.latitude >= ? AND p.latitude <= ? AND p.longitude >= ? AND p.longitude <= ?';
      query += geoFilter;
      countQuery += geoFilter;
      params.push(minLat, maxLat, minLng, maxLng);
    }
    
    if (search) {
      query += ' ORDER BY bm25(products_fts) ';
    } else {
      query += ' ORDER BY p.created_at DESC ';
    }

    query += ' LIMIT ? OFFSET ?';
    
    const products = db.prepare(query).all(...[...params, limit, offset]);
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
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
      ((SELECT COUNT(*) FROM rentals r2 JOIN products p2 ON r2.product_id = p2.id WHERE p2.supplier_id = u.id AND r2.status IN ('completed', 'returned')) >= 5 
       AND 
       (SELECT AVG(rating) FROM reviews rev JOIN products p3 ON rev.product_id = p3.id WHERE p3.supplier_id = u.id) >= 4.8) as is_super_supplier
      FROM products p 
      JOIN users u ON p.supplier_id = u.id 
      WHERE p.id = ? AND p.is_active = 1
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(product.id);
    product.images = images.sort((a, b) => b.is_primary - a.is_primary);

    const reviews = db.prepare(`
      SELECT r.id, r.rating, r.comment as text, r.image_url, r.created_at as date, u.name, u.avatar
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `).all(product.id);
    product.reviews = reviews;

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
