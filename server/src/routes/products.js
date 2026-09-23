const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { isWithinRoxas, isValidRoxasBarangay, formatRoxasAddress, getBarangayCoordinates, ROXAS_BARANGAYS } = require('../utils/roxasLocation');

const router = express.Router();

function validateAndNormalizeCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') {
    return { valid: false, lat: null, lng: null };
  }
  let lat = Number(latitude);
  let lng = Number(longitude);
  if (isNaN(lat) || isNaN(lng)) {
    return { valid: false, lat: null, lng: null };
  }
  // Prevent reversed coordinates: in Philippines lat is ~4.5 to 21.5, lng is ~116.5 to 127.0
  if (lat > 50 && lng < 50) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, lat: null, lng: null };
  }
  return {
    valid: true,
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6))
  };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage });

router.get('/locations/barangays', (req, res) => {
  try {
    const barangays = db.prepare('SELECT * FROM roxas_barangays ORDER BY name ASC').all();
    res.json({ success: true, data: barangays });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/categories', (req, res) => {
  try {
    const counts = db.prepare(`
      SELECT category as name, COUNT(*) as count 
      FROM products 
      WHERE is_active = 1 
      GROUP BY category
    `).all();
    res.json({ success: true, data: counts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', (req, res) => {
  try {
    let { search, category, barangay, minPrice, maxPrice, availability, startDate, endDate, minLat, maxLat, minLng, maxLng, userLat, userLng, radiusKm, page = 1, limit = 12 } = req.query;
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
      const sanitizedSearch = search.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).map(word => `${word}*`).join(' ');
      query += ' AND products_fts MATCH ?';
      countQuery += ' AND products_fts MATCH ?';
      params.push(sanitizedSearch);
    }
    if (category) {
      query += ' AND p.category = ?';
      countQuery += ' AND p.category = ?';
      params.push(category);
    }
    if (barangay) {
      query += ' AND p.barangay = ?';
      countQuery += ' AND p.barangay = ?';
      params.push(barangay);
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
    
    // Radius or Bounding Box filtering for maps
    if (userLat && userLng && radiusKm && !isNaN(Number(radiusKm))) {
      const rad = parseFloat(radiusKm);
      const uLat = parseFloat(userLat);
      const uLng = parseFloat(userLng);
      const latDelta = rad / 111.0;
      const lngDelta = rad / (111.0 * Math.max(0.1, Math.cos(uLat * (Math.PI / 180))));
      const geoFilter = ' AND p.latitude >= ? AND p.latitude <= ? AND p.longitude >= ? AND p.longitude <= ?';
      query += geoFilter;
      countQuery += geoFilter;
      params.push(uLat - latDelta, uLat + latDelta, uLng - lngDelta, uLng + lngDelta);
    } else if (minLat && maxLat && minLng && maxLng) {
      const geoFilter = ' AND p.latitude >= ? AND p.latitude <= ? AND p.longitude >= ? AND p.longitude <= ?';
      query += geoFilter;
      countQuery += geoFilter;
      params.push(parseFloat(minLat), parseFloat(maxLat), parseFloat(minLng), parseFloat(maxLng));
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

// Geocoding Proxy: Reverse Geocode (Lat/Lng -> Human address) restricted to Roxas
router.get('/geocode/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng parameters are required' });
    }
    if (!isWithinRoxas(lat, lng)) {
      return res.status(400).json({
        success: false,
        message: 'Only locations within Roxas, Oriental Mindoro are allowed.'
      });
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`, {
      headers: {
        'User-Agent': 'RentAWay-App/1.0 (contact@rentaway.ph)'
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'Geocoding service unavailable' });
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Geocoding Proxy: Search Address restricted to Roxas, Oriental Mindoro
router.get('/geocode/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Query string q is required' });
    }
    const cleanQuery = `${q.trim()}, Roxas, Oriental Mindoro, Philippines`;
    const viewbox = '121.36,12.68,121.57,12.49';
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&viewbox=${viewbox}&bounded=1&countrycodes=ph&limit=5&addressdetails=1`, {
      headers: {
        'User-Agent': 'RentAWay-App/1.0 (contact@rentaway.ph)'
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'Geocoding service unavailable' });
    }
    const data = await response.json();
    const filtered = (data || []).filter(item => isWithinRoxas(Number(item.lat), Number(item.lon)));
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, u.name as supplier_name, u.avatar as supplier_avatar, u.address as supplier_address, u.barangay as supplier_barangay,
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
    const { title, description, category, price_per_day, min_days, max_days, specs, location, barangay, latitude, longitude } = req.body;
    const id = uuidv4();
    const coords = validateAndNormalizeCoordinates(latitude, longitude);

    let finalLat = coords.valid ? coords.lat : null;
    let finalLng = coords.valid ? coords.lng : null;
    let finalLoc = location ? String(location).trim() : null;
    let finalBarangay = barangay ? String(barangay).trim() : null;

    // If coordinates, location, or barangay are not provided in payload, fallback to supplier's verified profile location
    if (!finalLat || !finalLng || !finalLoc || !finalBarangay) {
      const supplier = db.prepare('SELECT address, barangay, latitude, longitude FROM users WHERE id = ?').get(req.user.id);
      if (supplier) {
        if (!finalLoc && supplier.address) finalLoc = supplier.address;
        if (!finalBarangay && supplier.barangay) finalBarangay = supplier.barangay;
        if (!finalLat && supplier.latitude) finalLat = supplier.latitude;
        if (!finalLng && supplier.longitude) finalLng = supplier.longitude;
      }
    }

    // Strictly enforce Roxas, Oriental Mindoro location boundary
    if (finalLat && finalLng && !isWithinRoxas(finalLat, finalLng)) {
      return res.status(400).json({
        success: false,
        message: 'Only locations within Roxas, Oriental Mindoro are allowed.'
      });
    }

    // Auto-derive coordinates from barangay if coords are still missing
    if ((!finalLat || !finalLng) && finalBarangay) {
      const derived = getBarangayCoordinates(finalBarangay);
      finalLat = derived[0];
      finalLng = derived[1];
    }

    db.prepare(`
      INSERT INTO products (id, supplier_id, title, description, category, price_per_day, min_days, max_days, specs, location, barangay, latitude, longitude, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title, description, category, price_per_day, min_days, max_days, specs, finalLoc, finalBarangay, finalLat, finalLng, new Date().toISOString());
    
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticate, authorize('supplier', 'admin'), (req, res) => {
  try {
    const { title, description, category, price_per_day, min_days, max_days, specs, availability, location, barangay, latitude, longitude } = req.body;
    const product = db.prepare('SELECT supplier_id FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (req.user.role !== 'admin' && product.supplier_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let updateQuery = `
      UPDATE products SET title = ?, description = ?, category = ?, price_per_day = ?, min_days = ?, max_days = ?, specs = ?, availability = ?
    `;
    const updateParams = [title, description, category, price_per_day, min_days, max_days, specs, availability];
    
    if (location !== undefined) {
      updateQuery += ', location = ?';
      updateParams.push(location ? String(location).trim() : null);
    }

    if (barangay !== undefined) {
      updateQuery += ', barangay = ?';
      updateParams.push(barangay ? String(barangay).trim() : null);
    }

    if (latitude !== undefined && longitude !== undefined) {
      const coords = validateAndNormalizeCoordinates(latitude, longitude);
      if (coords.valid) {
        if (!isWithinRoxas(coords.lat, coords.lng)) {
          return res.status(400).json({
            success: false,
            message: 'Only locations within Roxas, Oriental Mindoro are allowed.'
          });
        }
        updateQuery += ', latitude = ?, longitude = ?';
        updateParams.push(coords.lat, coords.lng);
      }
    } else if (barangay !== undefined && barangay && String(barangay).trim()) {
      // If barangay is being updated but no explicit coordinates, auto-derive from barangay
      const derived = getBarangayCoordinates(String(barangay).trim());
      if (derived) {
        updateQuery += ', latitude = ?, longitude = ?';
        updateParams.push(derived[0], derived[1]);
      }
    }
    updateQuery += ' WHERE id = ?';
    updateParams.push(req.params.id);

    db.prepare(updateQuery).run(...updateParams);

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
