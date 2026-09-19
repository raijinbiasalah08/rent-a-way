const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorize('customer'), (req, res) => {
  try {
    const { product_id, start_date, end_date, notes } = req.body;
    const product = db.prepare('SELECT price_per_day, is_active FROM products WHERE id = ?').get(product_id);
    if (!product || !product.is_active) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid dates' });
    }

    const total_price = days * product.price_per_day;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO rentals (id, product_id, customer_id, start_date, end_date, total_price, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, product_id, req.user.id, start_date, end_date, total_price, notes, new Date().toISOString());

    const rental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: rental });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', authenticate, (req, res) => {
  try {
    let query;
    let params = [];

    const baseSelect = `
      SELECT r.*, p.title as product_title, u1.name as customer_name, u2.name as supplier_name 
      FROM rentals r
      JOIN products p ON r.product_id = p.id
      JOIN users u1 ON r.customer_id = u1.id
      JOIN users u2 ON p.supplier_id = u2.id
    `;

    if (req.user.role === 'customer') {
      query = baseSelect + ' WHERE r.customer_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'supplier') {
      query = baseSelect + ' WHERE p.supplier_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'admin') {
      query = baseSelect;
    }

    const rentals = db.prepare(query + ' ORDER BY r.created_at DESC').all(...[...params]);
    res.json({ success: true, data: rentals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authenticate, (req, res) => {
  try {
    const rental = db.prepare(`
      SELECT r.*, p.title as product_title, p.supplier_id, u1.name as customer_name, u2.name as supplier_name 
      FROM rentals r
      JOIN products p ON r.product_id = p.id
      JOIN users u1 ON r.customer_id = u1.id
      JOIN users u2 ON p.supplier_id = u2.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });

    if (req.user.role === 'customer' && rental.customer_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (req.user.role === 'supplier' && rental.supplier_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

    const payment = db.prepare('SELECT * FROM payments WHERE rental_id = ?').get(rental.id);
    rental.payment = payment;

    res.json({ success: true, data: rental });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/status', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    const rental = db.prepare('SELECT r.*, p.supplier_id FROM rentals r JOIN products p ON r.product_id = p.id WHERE r.id = ?').get(req.params.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });

    if (req.user.role === 'customer') {
      if (status !== 'cancelled' || rental.status !== 'pending') return res.status(400).json({ success: false, message: 'Customers can only cancel pending rentals' });
      if (rental.customer_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
    } else if (req.user.role === 'supplier') {
      if (!['approved', 'rejected'].includes(status) && !(rental.status === 'active' && status === 'completed')) return res.status(400).json({ success: false, message: 'Invalid status update for supplier' });
      if (rental.supplier_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    db.prepare('UPDATE rentals SET status = ? WHERE id = ?').run(status, req.params.id);
    const updated = db.prepare('SELECT * FROM rentals WHERE id = ?').get(req.params.id);

    // Emit notification to customer
    if (['approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
      const title = `Rental ${status.charAt(0).toUpperCase() + status.slice(1)}`;
      const message = `Your rental request for ${rental.product_title || 'an item'} has been ${status}.`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, link, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), rental.customer_id, title, message, '/customer/rentals', new Date().toISOString());
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
