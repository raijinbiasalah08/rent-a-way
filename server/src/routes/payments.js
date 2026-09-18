const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/rental/:rentalId', authenticate, authorize('customer'), (req, res) => {
  try {
    const { method } = req.body;
    const validMethods = ['gcash', 'maya', 'card', 'bank'];
    if (!validMethods.includes(method)) return res.status(400).json({ success: false, message: 'Invalid payment method' });

    const rental = db.prepare('SELECT * FROM rentals WHERE id = ? AND customer_id = ?').get(req.params.rentalId, req.user.id);
    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
    if (rental.status !== 'pending' && rental.status !== 'approved') return res.status(400).json({ success: false, message: 'Rental is not awaiting payment' });

    const existingPayment = db.prepare('SELECT * FROM payments WHERE rental_id = ?').get(rental.id);
    if (existingPayment) return res.status(400).json({ success: false, message: 'Payment already exists' });

    const id = uuidv4();
    const txRef = 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const paidAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO payments (id, rental_id, amount, method, status, transaction_ref, paid_at)
      VALUES (?, ?, ?, ?, 'completed', ?, ?)
    `).run(id, rental.id, rental.total_price, method, txRef, paidAt);

    db.prepare('UPDATE rentals SET status = ? WHERE id = ?').run('approved', rental.id);

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    const updatedRental = db.prepare('SELECT * FROM rentals WHERE id = ?').get(rental.id);

    res.status(201).json({ success: true, data: { payment, rental: updatedRental } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', authenticate, (req, res) => {
  try {
    let query;
    let params = [];
    if (req.user.role === 'customer') {
      query = `
        SELECT p.*, r.product_id, r.start_date, r.end_date 
        FROM payments p 
        JOIN rentals r ON p.rental_id = r.id 
        WHERE r.customer_id = ?
        ORDER BY p.paid_at DESC
      `;
      params.push(req.user.id);
    } else if (req.user.role === 'admin') {
      query = 'SELECT * FROM payments ORDER BY paid_at DESC';
    } else {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const payments = db.prepare(query).all(...params);
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
