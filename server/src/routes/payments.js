const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Create a simulated checkout session
router.post('/create-checkout-session', authenticate, authorize('customer'), (req, res) => {
  try {
    const { product_id, start_date, end_date, total_price, security_deposit, notes } = req.body;
    
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const rentalId = uuidv4();
    const paymentIntentId = 'pi_' + Math.random().toString(36).substring(2, 15);
    const created_at = new Date().toISOString();

    db.prepare(`
      INSERT INTO rentals (id, product_id, customer_id, start_date, end_date, total_price, security_deposit, payment_intent_id, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(rentalId, product_id, req.user.id, start_date, end_date, total_price, security_deposit, paymentIntentId, notes || null, created_at);

    res.json({ success: true, data: { rentalId, paymentIntentId, clientSecret: 'secret_' + paymentIntentId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Confirm payment
router.post('/confirm', authenticate, authorize('customer'), (req, res) => {
  try {
    const { rentalId, paymentIntentId, method } = req.body;
    
    const rental = db.prepare('SELECT * FROM rentals WHERE id = ? AND payment_intent_id = ?').get(rentalId, paymentIntentId);
    if (!rental) return res.status(404).json({ success: false, message: 'Invalid payment intent or rental' });

    const id = uuidv4();
    const txRef = 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const paidAt = new Date().toISOString();
    
    const totalPaid = rental.total_price + rental.security_deposit;

    db.prepare(`
      INSERT INTO payments (id, rental_id, amount, method, status, transaction_ref, paid_at)
      VALUES (?, ?, ?, ?, 'completed', ?, ?)
    `).run(id, rental.id, totalPaid, method || 'card', txRef, paidAt);

    db.prepare('UPDATE rentals SET status = ? WHERE id = ?').run('approved', rental.id);

    res.json({ success: true, message: 'Payment confirmed and rental approved' });
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
