const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all notifications for logged in user
router.get('/', authenticate, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.user.id);
    
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).count;

    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark one notification as read
router.put('/:id/read', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all as read
router.put('/read-all', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
