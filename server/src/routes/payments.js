const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const paymongo = require('../utils/paymongo');

const router = express.Router();

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `receipt-${uuidv4()}-${file.originalname}`)
});
const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ── GET SUPPLIER GCASH / MAYA DETAILS FOR BOOKING ───────────────────────
router.get('/supplier-account/:productId', authenticate, (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.id, p.title, p.supplier_id, 
             u.name as supplier_name, u.phone as supplier_phone,
             u.gcash_number, u.gcash_name, u.gcash_qr,
             u.maya_number, u.maya_name, u.maya_qr
      FROM products p
      JOIN users u ON p.supplier_id = u.id
      WHERE p.id = ?
    `).get(req.params.productId);

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Fallback to RentAway Escrow account if supplier hasn't set custom account
    const gcash = {
      number: product.gcash_number || product.supplier_phone || '0917-888-7692',
      name: product.gcash_name || product.supplier_name || 'RentAway Escrow Roxas',
      qr: product.gcash_qr || null
    };

    const maya = {
      number: product.maya_number || product.supplier_phone || '0918-999-3124',
      name: product.maya_name || product.supplier_name || 'RentAway Escrow Roxas',
      qr: product.maya_qr || null
    };

    res.json({
      success: true,
      data: {
        supplierId: product.supplier_id,
        supplierName: product.supplier_name,
        gcash,
        maya
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── SUBMIT REAL GCASH / MAYA PAYMENT PROOF (SCREENSHOT & REF NO) ────────
router.post('/submit-proof', authenticate, uploadReceipt.single('receipt'), (req, res) => {
  try {
    let {
      rentalId,
      product_id,
      start_date,
      end_date,
      total_price,
      security_deposit,
      notes,
      method = 'gcash',
      transaction_ref,
      sender_name,
      sender_phone
    } = req.body;

    if (!transaction_ref || !transaction_ref.trim()) {
      return res.status(400).json({ success: false, message: 'Reference number is required' });
    }

    let rental;
    let product;

    if (rentalId) {
      rental = db.prepare(`
        SELECT r.*, p.title as product_title, p.supplier_id, u.name as customer_name
        FROM rentals r
        JOIN products p ON r.product_id = p.id
        JOIN users u ON r.customer_id = u.id
        WHERE r.id = ?
      `).get(rentalId);

      if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
      product = { title: rental.product_title, supplier_id: rental.supplier_id };
    } else {
      product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      rentalId = uuidv4();
      const created_at = new Date().toISOString();

      db.prepare(`
        INSERT INTO rentals (id, product_id, customer_id, start_date, end_date, total_price, security_deposit, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(rentalId, product_id, req.user.id, start_date, end_date, total_price, security_deposit || 0, notes || null, created_at);

      rental = {
        id: rentalId,
        total_price,
        security_deposit: security_deposit || 0,
        product_title: product.title,
        supplier_id: product.supplier_id,
        customer_name: req.user.name
      };
    }

    const totalAmount = Number(rental.total_price || 0) + Number(rental.security_deposit || 0);
    const receiptImage = req.file ? `/uploads/${req.file.filename}` : null;
    const paidAt = new Date().toISOString();

    const existingPayment = db.prepare('SELECT id FROM payments WHERE rental_id = ?').get(rental.id);
    let paymentId;

    if (existingPayment) {
      paymentId = existingPayment.id;
      db.prepare(`
        UPDATE payments
        SET amount = ?, method = ?, status = 'pending_verification', transaction_ref = ?,
            receipt_image = COALESCE(?, receipt_image), sender_name = ?, sender_phone = ?, paid_at = ?
        WHERE id = ?
      `).run(totalAmount, method, transaction_ref.trim(), receiptImage, sender_name || null, sender_phone || null, paidAt, paymentId);
    } else {
      paymentId = uuidv4();
      db.prepare(`
        INSERT INTO payments (id, rental_id, amount, method, status, transaction_ref, receipt_image, sender_name, sender_phone, paid_at)
        VALUES (?, ?, ?, ?, 'pending_verification', ?, ?, ?, ?, ?)
      `).run(paymentId, rental.id, totalAmount, method, transaction_ref.trim(), receiptImage, sender_name || null, sender_phone || null, paidAt);
    }

    // Update rental payment_intent_id with reference number
    db.prepare('UPDATE rentals SET payment_intent_id = ? WHERE id = ?').run(transaction_ref.trim(), rental.id);

    // Notify supplier of uploaded receipt & reference number
    const notifId = uuidv4();
    const notifTitle = `New ${method.toUpperCase()} Payment Submitted! 🧾`;
    const notifMessage = `${rental.customer_name || req.user.name} submitted ${method.toUpperCase()} proof (Ref: ${transaction_ref.trim()}) for "${rental.product_title}". Please inspect and verify.`;
    const notifLink = '/supplier/rentals';

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, link, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notifId, rental.supplier_id, notifTitle, notifMessage, notifLink, paidAt);

    try {
      const socket = require('../socket');
      const io = socket.getIO();
      const receiverSocketId = socket.getUserSocketId(rental.supplier_id);
      if (receiverSocketId) {
        const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
        io.to(receiverSocketId).emit('new_notification', notif);
        io.to(receiverSocketId).emit('rental_status_changed', { rentalId: rental.id, status: 'pending' });
      }
    } catch (e) {
      // Socket non-fatal
    }

    res.status(201).json({
      success: true,
      message: 'Payment proof submitted! Supplier has been notified to verify your payment.',
      data: {
        rentalId: rental.id,
        paymentId,
        transaction_ref: transaction_ref.trim(),
        receipt_image: receiptImage,
        status: 'pending_verification'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET PAYMENT PROOF DETAILS (FOR VERIFICATION MODAL) ───────────────────
router.get('/proof/:rentalId', authenticate, (req, res) => {
  try {
    const payment = db.prepare(`
      SELECT p.*, r.start_date, r.end_date, r.total_price, r.security_deposit, r.status as rental_status,
             prod.title as product_title, u_cust.name as customer_name, u_cust.phone as customer_phone,
             u_sup.name as supplier_name
      FROM payments p
      JOIN rentals r ON p.rental_id = r.id
      JOIN products prod ON r.product_id = prod.id
      JOIN users u_cust ON r.customer_id = u_cust.id
      JOIN users u_sup ON prod.supplier_id = u_sup.id
      WHERE r.id = ?
    `).get(req.params.rentalId);

    if (!payment) return res.status(404).json({ success: false, message: 'No payment record found for this rental' });

    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── SUPPLIER / ADMIN VERIFIES PAYMENT PROOF ──────────────────────────────
router.put('/verify-proof/:rentalId', authenticate, (req, res) => {
  try {
    const { rentalId } = req.params;
    const { action = 'approve', notes = '' } = req.body;

    const rental = db.prepare(`
      SELECT r.*, p.title as product_title, p.supplier_id, u1.name as customer_name, u2.name as supplier_name
      FROM rentals r
      JOIN products p ON r.product_id = p.id
      JOIN users u1 ON r.customer_id = u1.id
      JOIN users u2 ON p.supplier_id = u2.id
      WHERE r.id = ?
    `).get(rentalId);

    if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });

    if (req.user.role === 'supplier' && rental.supplier_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      db.prepare("UPDATE payments SET status = 'completed' WHERE rental_id = ?").run(rental.id);
      db.prepare("UPDATE rentals SET status = 'approved' WHERE id = ?").run(rental.id);

      // Notify customer
      const notifId = uuidv4();
      const notifTitle = 'Payment Verified & Rental Approved! 🎉';
      const notifMessage = `${rental.supplier_name} confirmed your payment for "${rental.product_title}". You can now view and print your Official Receipt!`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, link, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(notifId, rental.customer_id, notifTitle, notifMessage, '/customer/rentals', now);

      try {
        const socket = require('../socket');
        const io = socket.getIO();
        const receiverSocketId = socket.getUserSocketId(rental.customer_id);
        if (receiverSocketId) {
          const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
          io.to(receiverSocketId).emit('new_notification', notif);
          io.to(receiverSocketId).emit('rental_status_changed', { rentalId: rental.id, status: 'approved' });
        }
      } catch (e) {}

      return res.json({ success: true, message: 'Payment verified and rental approved successfully!' });
    } else {
      // Discrepancy / rejection
      db.prepare("UPDATE payments SET status = 'rejected' WHERE rental_id = ?").run(rental.id);

      const notifId = uuidv4();
      const notifTitle = 'Payment Proof Discrepancy Reported ⚠️';
      const notifMessage = `Supplier flagged an issue with payment for "${rental.product_title}"${notes ? `: "${notes}"` : '. Please check reference number.'}`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, link, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(notifId, rental.customer_id, notifTitle, notifMessage, '/customer/rentals', now);

      try {
        const socket = require('../socket');
        const io = socket.getIO();
        const receiverSocketId = socket.getUserSocketId(rental.customer_id);
        if (receiverSocketId) {
          const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
          io.to(receiverSocketId).emit('new_notification', notif);
          io.to(receiverSocketId).emit('rental_status_changed', { rentalId: rental.id, status: 'pending' });
        }
      } catch (e) {}

      return res.json({ success: true, message: 'Payment discrepancy reported to customer' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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

// Process direct payment for rental (from PaymentModal)
router.post('/rental/:rentalId', authenticate, (req, res) => {
  try {
    const { rentalId } = req.params;
    const { method = 'gcash' } = req.body;

    const rental = db.prepare(`
      SELECT r.*, p.title as product_title, p.supplier_id, u1.name as customer_name, u2.name as supplier_name
      FROM rentals r
      JOIN products p ON r.product_id = p.id
      JOIN users u1 ON r.customer_id = u1.id
      JOIN users u2 ON p.supplier_id = u2.id
      WHERE r.id = ?
    `).get(rentalId);

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental not found' });
    }

    if (req.user.role === 'customer' && rental.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const totalPaid = Number(rental.total_price || 0) + Number(rental.security_deposit || 0);
    const paymentId = uuidv4();
    const txRef = 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const paidAt = new Date().toISOString();

    // Check if payment already exists
    const existingPayment = db.prepare('SELECT id FROM payments WHERE rental_id = ?').get(rental.id);
    if (existingPayment) {
      db.prepare(`
        UPDATE payments 
        SET amount = ?, method = ?, status = 'completed', transaction_ref = ?, paid_at = ?
        WHERE id = ?
      `).run(totalPaid, method, txRef, paidAt, existingPayment.id);
    } else {
      db.prepare(`
        INSERT INTO payments (id, rental_id, amount, method, status, transaction_ref, paid_at)
        VALUES (?, ?, ?, ?, 'completed', ?, ?)
      `).run(paymentId, rental.id, totalPaid, method, txRef, paidAt);
    }

    // Update rental status to approved
    db.prepare("UPDATE rentals SET status = 'approved' WHERE id = ?").run(rental.id);

    // Notify supplier of received payment & booking confirmation
    const notifId = uuidv4();
    const notifTitle = 'Payment Received & Rental Approved! 💳';
    const notifMessage = `Payment of ₱${totalPaid.toLocaleString()} via ${method.toUpperCase()} for "${rental.product_title}" from ${rental.customer_name} has been confirmed.`;
    const notifLink = '/supplier/rentals';

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, link, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notifId, rental.supplier_id, notifTitle, notifMessage, notifLink, paidAt);

    try {
      const socket = require('../socket');
      const io = socket.getIO();
      const receiverSocketId = socket.getUserSocketId(rental.supplier_id);
      if (receiverSocketId) {
        const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
        io.to(receiverSocketId).emit('new_notification', notif);
        io.to(receiverSocketId).emit('rental_status_changed', { rentalId: rental.id, status: 'approved' });
      }
    } catch (socketErr) {
      console.warn('Socket notification error in payment:', socketErr.message);
    }

    res.json({
      success: true,
      message: 'Payment recorded and rental approved',
      data: {
        paymentId: existingPayment ? existingPayment.id : paymentId,
        transaction_ref: txRef,
        amount: totalPaid,
        method,
        paid_at: paidAt,
        status: 'completed'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get payment details by rental ID (for receipts / invoices)
router.get('/rental/:rentalId', authenticate, (req, res) => {
  try {
    const payment = db.prepare(`
      SELECT p.*, r.start_date, r.end_date, r.total_price, r.security_deposit, r.status as rental_status,
             prod.title as product_title, prod.location as product_location, prod.barangay as product_barangay,
             u_cust.name as customer_name, u_cust.email as customer_email, u_cust.phone as customer_phone,
             u_sup.name as supplier_name, u_sup.email as supplier_email, u_sup.phone as supplier_phone, u_sup.address as supplier_address
      FROM payments p
      JOIN rentals r ON p.rental_id = r.id
      JOIN products prod ON r.product_id = prod.id
      JOIN users u_cust ON r.customer_id = u_cust.id
      JOIN users u_sup ON prod.supplier_id = u_sup.id
      WHERE r.id = ?
    `).get(req.params.rentalId);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found for this rental' });
    }

    res.json({ success: true, data: payment });
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
        SELECT p.*, r.product_id, r.start_date, r.end_date, prod.title as product_title, u_sup.name as supplier_name 
        FROM payments p 
        JOIN rentals r ON p.rental_id = r.id 
        JOIN products prod ON r.product_id = prod.id
        JOIN users u_sup ON prod.supplier_id = u_sup.id
        WHERE r.customer_id = ?
        ORDER BY p.paid_at DESC
      `;
      params.push(req.user.id);
    } else if (req.user.role === 'supplier') {
      query = `
        SELECT p.*, r.product_id, r.start_date, r.end_date, prod.title as product_title, u_cust.name as customer_name 
        FROM payments p 
        JOIN rentals r ON p.rental_id = r.id 
        JOIN products prod ON r.product_id = prod.id
        JOIN users u_cust ON r.customer_id = u_cust.id
        WHERE prod.supplier_id = ?
        ORDER BY p.paid_at DESC
      `;
      params.push(req.user.id);
    } else if (req.user.role === 'admin') {
      query = `
        SELECT p.*, r.product_id, r.start_date, r.end_date, prod.title as product_title, u_cust.name as customer_name, u_sup.name as supplier_name 
        FROM payments p 
        JOIN rentals r ON p.rental_id = r.id 
        JOIN products prod ON r.product_id = prod.id
        JOIN users u_cust ON r.customer_id = u_cust.id
        JOIN users u_sup ON prod.supplier_id = u_sup.id
        ORDER BY p.paid_at DESC
      `;
    } else {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const payments = db.prepare(query).all(...params);
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PAYMONGO CREATE CHECKOUT SESSION ─────────────────────────────────────
router.post('/paymongo/create-session', authenticate, async (req, res) => {
  try {
    let { rentalId, product_id, start_date, end_date, total_price, security_deposit, notes } = req.body;
    let rental;
    let product;

    if (rentalId) {
      rental = db.prepare(`
        SELECT r.*, p.title as product_title, p.supplier_id, u.name as customer_name, u.email as customer_email
        FROM rentals r
        JOIN products p ON r.product_id = p.id
        JOIN users u ON r.customer_id = u.id
        WHERE r.id = ?
      `).get(rentalId);

      if (!rental) return res.status(404).json({ success: false, message: 'Rental not found' });
      product = { title: rental.product_title, supplier_id: rental.supplier_id };
    } else {
      product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      rentalId = uuidv4();
      const created_at = new Date().toISOString();

      db.prepare(`
        INSERT INTO rentals (id, product_id, customer_id, start_date, end_date, total_price, security_deposit, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(rentalId, product_id, req.user.id, start_date, end_date, total_price, security_deposit || 0, notes || null, created_at);

      rental = {
        id: rentalId,
        total_price,
        security_deposit: security_deposit || 0,
        product_title: product.title,
        customer_name: req.user.name,
        customer_email: req.user.email
      };
    }

    const totalAmount = Number(rental.total_price || 0) + Number(rental.security_deposit || 0);

    const session = await paymongo.createCheckoutSession({
      amount: totalAmount,
      description: `RentAway: ${product.title || rental.product_title}`,
      customerName: rental.customer_name || req.user.name,
      customerEmail: rental.customer_email || req.user.email,
      successUrl: `http://localhost:5173/customer/rentals?payment=success&rental_id=${rental.id}`,
      cancelUrl: `http://localhost:5173/customer/rentals?payment=cancelled&rental_id=${rental.id}`
    });

    db.prepare('UPDATE rentals SET payment_intent_id = ? WHERE id = ?').run(session.checkoutSessionId, rental.id);

    res.json({
      success: true,
      data: {
        rentalId: rental.id,
        checkoutUrl: session.checkoutUrl,
        checkoutSessionId: session.checkoutSessionId,
        isSimulated: session.isSimulated,
        message: session.message
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── VERIFY PAYMONGO PAYMENT ──────────────────────────────────────────────
router.get('/paymongo/verify/:checkoutSessionId', authenticate, async (req, res) => {
  try {
    const { checkoutSessionId } = req.params;

    const rental = db.prepare(`
      SELECT r.*, p.title as product_title, p.supplier_id, u1.name as customer_name, u2.name as supplier_name
      FROM rentals r
      JOIN products p ON r.product_id = p.id
      JOIN users u1 ON r.customer_id = u1.id
      JOIN users u2 ON p.supplier_id = u2.id
      WHERE r.payment_intent_id = ?
    `).get(checkoutSessionId);

    if (!rental) {
      return res.status(404).json({ success: false, message: 'Rental matching checkout session not found' });
    }

    const verification = await paymongo.verifyCheckoutSession(checkoutSessionId);

    if (verification.paid) {
      const totalAmount = Number(rental.total_price || 0) + Number(rental.security_deposit || 0);
      const paidAt = new Date().toISOString();
      const method = verification.method || 'paymongo';
      const txRef = verification.txRef || 'TX-PM-' + Math.random().toString(36).substring(2, 9).toUpperCase();

      // Check if payment already exists
      const existingPayment = db.prepare('SELECT id FROM payments WHERE rental_id = ?').get(rental.id);
      if (existingPayment) {
        db.prepare(`
          UPDATE payments 
          SET amount = ?, method = ?, status = 'completed', transaction_ref = ?, paid_at = ?
          WHERE id = ?
        `).run(totalAmount, method, txRef, paidAt, existingPayment.id);
      } else {
        const paymentId = uuidv4();
        db.prepare(`
          INSERT INTO payments (id, rental_id, amount, method, status, transaction_ref, paid_at)
          VALUES (?, ?, ?, ?, 'completed', ?, ?)
        `).run(paymentId, rental.id, totalAmount, method, txRef, paidAt);
      }

      // Mark rental approved
      db.prepare("UPDATE rentals SET status = 'approved' WHERE id = ?").run(rental.id);

      // Notify supplier
      const notifId = uuidv4();
      const notifTitle = 'Payment Verified via PayMongo! 💳';
      const notifMessage = `PayMongo verified payment of ₱${totalAmount.toLocaleString()} via ${method.toUpperCase()} for "${rental.product_title}".`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, link, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(notifId, rental.supplier_id, notifTitle, notifMessage, '/supplier/rentals', paidAt);

      try {
        const socket = require('../socket');
        const io = socket.getIO();
        const receiverSocketId = socket.getUserSocketId(rental.supplier_id);
        if (receiverSocketId) {
          const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
          io.to(receiverSocketId).emit('new_notification', notif);
          io.to(receiverSocketId).emit('rental_status_changed', { rentalId: rental.id, status: 'approved' });
        }
      } catch (err) {
        // Socket non-fatal
      }

      return res.json({
        success: true,
        verified: true,
        rentalId: rental.id,
        txRef,
        method,
        status: 'approved'
      });
    }

    res.json({
      success: true,
      verified: false,
      status: verification.status,
      message: 'Payment not yet confirmed by PayMongo'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

