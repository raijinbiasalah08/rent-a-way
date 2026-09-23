const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/complaints', authenticate, (req, res) => {
  try {
    const { reported_id, subject, details } = req.body;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO complaints (id, reporter_id, reported_id, subject, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, reported_id, subject, details, new Date().toISOString());
    res.status(201).json({ success: true, message: 'Complaint filed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// All routes below are admin only
router.use(authenticate, authorize('admin'));

router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1').get().c;
    const totalRentals = db.prepare('SELECT COUNT(*) as c FROM rentals').get().c;
    const activeRentals = db.prepare("SELECT COUNT(*) as c FROM rentals WHERE status = 'active'").get().c;
    const pendingRentals = db.prepare("SELECT COUNT(*) as c FROM rentals WHERE status = 'pending'").get().c;
    const openComplaints = db.prepare("SELECT COUNT(*) as c FROM complaints WHERE status = 'open'").get().c;
    const totalRevenue = db.prepare("SELECT SUM(amount) as s FROM payments WHERE status = 'completed' OR status = 'paid'").get().s || 0;

    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', COALESCE(p.paid_at, r.created_at)) as month, SUM(p.amount) as revenue
      FROM payments p
      JOIN rentals r ON p.rental_id = r.id
      WHERE p.status = 'completed' OR p.status = 'paid'
      GROUP BY month
      ORDER BY month ASC
    `).all();

    res.json({
      success: true,
      data: { totalUsers, totalProducts, totalRentals, activeRentals, pendingRentals, openComplaints, totalRevenue, monthlyRevenue }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users', (req, res) => {
  try {
    const { search, role } = req.query;
    let query = 'SELECT id, name, email, role, phone, address, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    
    const users = db.prepare(query).all(...[...params]);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/users/:id', (req, res) => {
  try {
    const { name, role, is_active } = req.body;
    db.prepare('UPDATE users SET name = ?, role = ?, is_active = ? WHERE id = ?').run(name, role, is_active, req.params.id);
    const user = db.prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, u.name as supplier_name 
      FROM products p JOIN users u ON p.supplier_id = u.id
    `).all();
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/products/:id/toggle', (req, res) => {
  try {
    db.prepare('UPDATE products SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Product status toggled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/rentals', (req, res) => {
  try {
    const rentals = db.prepare(`
      SELECT r.*, p.title, u1.name as customer_name, u2.name as supplier_name
      FROM rentals r
      JOIN products p ON r.product_id = p.id
      JOIN users u1 ON r.customer_id = u1.id
      JOIN users u2 ON p.supplier_id = u2.id
    `).all();
    res.json({ success: true, data: rentals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/payments', (req, res) => {
  try {
    const payments = db.prepare(`
      SELECT p.*, r.start_date, r.end_date, u.name as customer_name
      FROM payments p
      JOIN rentals r ON p.rental_id = r.id
      JOIN users u ON r.customer_id = u.id
    `).all();
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/complaints', (req, res) => {
  try {
    const complaints = db.prepare(`
      SELECT c.*, u.name as reporter_name 
      FROM complaints c 
      JOIN users u ON c.reporter_id = u.id
    `).all();
    res.json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/complaints/:id', (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE complaints SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true, message: 'Complaint status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/reports', (req, res) => {
  try {
    // Top products by rentals
    const topProducts = db.prepare(`
      SELECT p.title, COUNT(r.id) as rental_count 
      FROM products p LEFT JOIN rentals r ON p.id = r.product_id
      GROUP BY p.id ORDER BY rental_count DESC LIMIT 5
    `).all();

    const rentalsByCategory = db.prepare(`
      SELECT p.category, COUNT(r.id) as count
      FROM products p JOIN rentals r ON p.id = r.product_id
      GROUP BY p.category
    `).all();

    // Revenue by month — last 6 months
    const revenueByMonth = db.prepare(`
      SELECT
        strftime('%b %Y', paid_at) as month,
        strftime('%Y-%m', paid_at) as sort_key,
        SUM(amount) as revenue,
        COUNT(*) as transactions
      FROM payments
      WHERE status = 'completed'
        AND paid_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', paid_at)
      ORDER BY sort_key ASC
    `).all();

    res.json({ success: true, data: { topProducts, rentalsByCategory, revenueByMonth } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
