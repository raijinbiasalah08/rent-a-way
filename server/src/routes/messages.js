const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const socket = require('../socket');

const router = express.Router();

// Get list of conversations (distinct users I have messaged with)
router.get('/conversations', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    
    // Group messages by the "other" user
    const conversations = db.prepare(`
      SELECT 
        u.id as other_user_id, u.name, u.avatar, u.role,
        MAX(m.created_at) as last_message_time,
        SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) as unread_count,
        (SELECT content FROM messages 
         WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?) 
         ORDER BY created_at DESC LIMIT 1) as last_message
      FROM messages m
      JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id) AND u.id != ?
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY u.id
      ORDER BY last_message_time DESC
    `).all(userId, userId, userId, userId, userId, userId);

    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get messages with a specific user
router.get('/:otherUserId', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.otherUserId;
    const productId = req.query.productId; // optional context

    // Mark as read
    db.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0').run(otherId, userId);

    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(userId, otherId, otherId, userId);

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send a message
router.post('/', authenticate, (req, res) => {
  try {
    const { receiver_id, product_id, content } = req.body;
    if (!receiver_id || !content) {
      return res.status(400).json({ success: false, message: 'Receiver and content required' });
    }

    const id = uuidv4();
    const created_at = new Date().toISOString();

    db.prepare(`
      INSERT INTO messages (id, sender_id, receiver_id, product_id, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, receiver_id, product_id || null, content, created_at);

    // Also create a notification for the receiver
    const senderName = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id).name;
    const notifId = uuidv4();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, link, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notifId, receiver_id, 'New Message', `You have a new message from ${senderName}`, `/messages`, created_at);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

    // Broadcast via WebSocket if receiver is online
    try {
      const io = socket.getIO();
      const receiverSocketId = socket.getUserSocketId(receiver_id);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', message);
        const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
        io.to(receiverSocketId).emit('new_notification', notif);
      }
    } catch(err) {
      console.error('Socket.io error:', err.message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
