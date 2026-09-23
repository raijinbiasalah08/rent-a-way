const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const socket = require('../socket');

const router = express.Router();

router.post('/', authenticate, authorize('customer'), (req, res) => {
  try {
    const { product_id, start_date, end_date, notes, security_deposit } = req.body;
    const product = db.prepare('SELECT id, title, supplier_id, price_per_day, is_active FROM products WHERE id = ?').get(product_id);
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
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO rentals (id, product_id, customer_id, start_date, end_date, total_price, security_deposit, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, product_id, req.user.id, start_date, end_date, total_price, Number(security_deposit || 0), notes || null, createdAt);

    // Notify supplier of new pending booking request
    const notifId = uuidv4();
    const notifTitle = 'New Rental Request! 📦';
    const notifMessage = `${req.user.name || 'A customer'} submitted a rental request for "${product.title}".`;
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, link, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notifId, product.supplier_id, notifTitle, notifMessage, '/supplier/rentals', createdAt);

    try {
      const io = socket.getIO();
      const receiverSocketId = socket.getUserSocketId(product.supplier_id);
      if (receiverSocketId) {
        const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
        io.to(receiverSocketId).emit('new_notification', notif);
        io.to(receiverSocketId).emit('rental_status_changed', { rentalId: id, status: 'pending' });
      }
    } catch (e) {
      // Socket non-fatal
    }

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
      SELECT r.*, 
             p.title as product_title, 
             p.category as product_category,
             (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image,
             u1.name as customer_name, 
             u1.phone as customer_phone,
             u2.name as supplier_name,
             u2.avatar as supplier_avatar,
             u2.barangay as supplier_barangay,
             pay.method as payment_method,
             pay.status as payment_status,
             pay.transaction_ref as payment_ref,
             pay.receipt_image as payment_receipt,
             pay.sender_name as payment_sender_name,
             pay.sender_phone as payment_sender_phone
      FROM rentals r
      JOIN products p ON r.product_id = p.id
      JOIN users u1 ON r.customer_id = u1.id
      JOIN users u2 ON p.supplier_id = u2.id
      LEFT JOIN payments pay ON pay.rental_id = r.id
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
    const { status, notes } = req.body;
    const rental = db.prepare(`
      SELECT r.*, p.title as product_title, p.supplier_id, u1.name as customer_name, u2.name as supplier_name
      FROM rentals r
      JOIN products p ON r.product_id = p.id
      JOIN users u1 ON r.customer_id = u1.id
      JOIN users u2 ON p.supplier_id = u2.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });

    let targetUserId = null;
    let notifTitle = '';
    let notifMessage = '';
    let notifLink = '';

    if (req.user.role === 'customer') {
      if (rental.customer_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      if (status === 'cancelled') {
        if (!['pending', 'approved'].includes(rental.status)) {
          return res.status(400).json({ success: false, message: 'Can only cancel pending or approved rentals before pickup' });
        }
        targetUserId = rental.supplier_id;
        notifTitle = 'Rental Cancelled';
        notifMessage = `${rental.customer_name} cancelled their rental for "${rental.product_title}"${notes ? `: "${notes}"` : '.'}`;
        notifLink = '/supplier/rentals';
      } else if (status === 'returned') {
        if (rental.status !== 'active') {
          return res.status(400).json({ success: false, message: 'Only active rentals can be marked as returned' });
        }
        targetUserId = rental.supplier_id;
        notifTitle = 'Item Returned';
        notifMessage = `${rental.customer_name} marked "${rental.product_title}" as returned. Please verify and confirm return.`;
        notifLink = '/supplier/rentals';
      } else {
        return res.status(400).json({ success: false, message: 'Invalid status update for customer' });
      }

    } else if (req.user.role === 'supplier' || req.user.role === 'admin') {
      if (req.user.role === 'supplier' && rental.supplier_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      targetUserId = rental.customer_id;
      notifLink = '/customer/rentals';

      if (status === 'approved') {
        if (rental.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending rentals can be approved' });
        notifTitle = 'Rental Approved! 🎉';
        notifMessage = `Your rental request for "${rental.product_title}" has been approved by ${rental.supplier_name}.`;
      } else if (status === 'rejected') {
        if (rental.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending rentals can be rejected' });
        notifTitle = 'Rental Request Declined';
        notifMessage = `Your rental request for "${rental.product_title}" was declined${notes ? `: "${notes}"` : '.'}`;
      } else if (status === 'active') {
        if (rental.status !== 'approved') return res.status(400).json({ success: false, message: 'Only approved rentals can be marked active (handed over)' });
        notifTitle = 'Item Handed Over — Rental Active 🚀';
        notifMessage = `The item "${rental.product_title}" has been handed over. Enjoy your rental!`;
      } else if (status === 'completed') {
        if (!['active', 'returned'].includes(rental.status)) return res.status(400).json({ success: false, message: 'Only active or returned items can be marked completed' });
        notifTitle = 'Rental Completed & Return Verified ✅';
        notifMessage = `Return of "${rental.product_title}" has been verified by the supplier. Please leave a review!`;
      } else {
        return res.status(400).json({ success: false, message: 'Invalid status update for supplier' });
      }
    }

    let updateQuery = 'UPDATE rentals SET status = ?';
    const updateParams = [status];
    if (notes) {
      updateQuery += ", notes = CASE WHEN notes IS NULL OR notes = '' THEN ? ELSE notes || ' | ' || ? END";
      updateParams.push(notes, notes);
    }
    updateQuery += ' WHERE id = ?';
    updateParams.push(req.params.id);

    db.prepare(updateQuery).run(...updateParams);
    const updated = db.prepare('SELECT * FROM rentals WHERE id = ?').get(req.params.id);

    // Emit notification and real-time socket events
    if (targetUserId) {
      const notifId = uuidv4();
      const createdAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, link, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(notifId, targetUserId, notifTitle, notifMessage, notifLink, createdAt);

      try {
        const io = socket.getIO();
        const receiverSocketId = socket.getUserSocketId(targetUserId);
        if (receiverSocketId) {
          const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
          io.to(receiverSocketId).emit('new_notification', notif);
          io.to(receiverSocketId).emit('rental_status_changed', { rentalId: rental.id, status, notes });
        }
      } catch (err) {
        console.error('Socket notification error:', err.message);
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
