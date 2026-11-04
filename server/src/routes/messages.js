const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const uploadsDir = require('../utils/uploads');
const socket = require('../socket');

const router = express.Router();

// ── Image upload for chat ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `msg-${uuidv4()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP images are allowed'));
  }
});

// ── Helper: emit socket event safely ────────────────────────────────────────
function emit(userId, event, data) {
  try {
    const io = socket.getIO();
    const sid = socket.getUserSocketId(userId);
    if (sid) io.to(sid).emit(event, data);
  } catch (e) { /* socket not ready */ }
}

// ── GET /conversations ───────────────────────────────────────────────────────
router.get('/conversations', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = db.prepare(`
      SELECT
        u.id as other_user_id, u.name, u.avatar, u.role,
        MAX(m.created_at) as last_message_time,
        SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) as unread_count,
        (SELECT content FROM messages
         WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT type FROM messages
         WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1) as last_message_type
      FROM messages m
      JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id) AND u.id != ?
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
        AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)
        AND ? NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = u.id)
      GROUP BY u.id
      ORDER BY last_message_time DESC
    `).all(userId, userId, userId, userId, userId, userId, userId, userId, userId, userId);

    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:otherUserId — fetch messages + mark as read ────────────────────────
router.get('/:otherUserId', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.otherUserId;

    // Check if either user has blocked the other
    const isBlocked = db.prepare(`
      SELECT id FROM blocked_users
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
    `).get(userId, otherId, otherId, userId);

    // Mark messages as read + record read_at timestamp
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE messages SET is_read = 1, read_at = ?
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `).run(now, otherId, userId);

    // Notify sender their messages were read
    emit(otherId, 'messages_read', { readerId: userId, readAt: now });

    const messages = db.prepare(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(userId, otherId, otherId, userId);

    res.json({ success: true, data: messages, blocked: !!isBlocked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST / — send a text message ─────────────────────────────────────────────
router.post('/', authenticate, (req, res) => {
  try {
    const { receiver_id, product_id, content, reply_to_id, reply_preview, type = 'text' } = req.body;
    if (!receiver_id || (!content && type === 'text')) {
      return res.status(400).json({ success: false, message: 'Receiver and content required' });
    }

    // Block check
    const isBlocked = db.prepare(`
      SELECT id FROM blocked_users
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
    `).get(req.user.id, receiver_id, receiver_id, req.user.id);
    if (isBlocked) {
      return res.status(403).json({ success: false, message: 'Cannot send message — user is blocked.' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const isOnline = socket.isUserOnline(receiver_id);
    const delivered_at = isOnline ? now : null;

    db.prepare(`
      INSERT INTO messages (id, sender_id, receiver_id, product_id, content, type, reply_to_id, reply_preview, delivered_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, receiver_id, product_id || null, content, type, reply_to_id || null, reply_preview || null, delivered_at, now);

    // Notification
    const senderName = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id)?.name || 'Someone';
    const notifId = uuidv4();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, link, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notifId, receiver_id, 'New Message', `New message from ${senderName}`, '/messages', now);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    emit(receiver_id, 'new_message', message);
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
    emit(receiver_id, 'new_notification', notif);

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /image — send an image in chat ──────────────────────────────────────
router.post('/image', authenticate, upload.single('image'), (req, res) => {
  try {
    const { receiver_id, reply_to_id, reply_preview } = req.body;
    if (!receiver_id) return res.status(400).json({ success: false, message: 'receiver_id required' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Image file required' });

    const isBlocked = db.prepare(`
      SELECT id FROM blocked_users WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)
    `).get(req.user.id, receiver_id, receiver_id, req.user.id);
    if (isBlocked) return res.status(403).json({ success: false, message: 'User is blocked.' });

    const id = uuidv4();
    const now = new Date().toISOString();
    const imageUrl = `/uploads/${req.file.filename}`;
    const isOnline = socket.isUserOnline(receiver_id);
    const delivered_at = isOnline ? now : null;

    db.prepare(`
      INSERT INTO messages (id, sender_id, receiver_id, content, type, image_url, reply_to_id, reply_preview, delivered_at, created_at)
      VALUES (?, ?, ?, ?, 'image', ?, ?, ?, ?, ?)
    `).run(id, req.user.id, receiver_id, '📷 Image', imageUrl, reply_to_id || null, reply_preview || null, delivered_at, now);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    emit(receiver_id, 'new_message', message);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /equipment — share an equipment card ─────────────────────────────────
router.post('/equipment', authenticate, (req, res) => {
  try {
    const { receiver_id, equipment_id } = req.body;
    if (!receiver_id || !equipment_id) {
      return res.status(400).json({ success: false, message: 'receiver_id and equipment_id required' });
    }

    const isBlocked = db.prepare(`
      SELECT id FROM blocked_users WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)
    `).get(req.user.id, receiver_id, receiver_id, req.user.id);
    if (isBlocked) return res.status(403).json({ success: false, message: 'User is blocked.' });

    // Fetch equipment data to embed in the message
    const equipment = db.prepare(`
      SELECT p.id, p.title, p.price_per_day, p.availability, p.barangay, p.location,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p WHERE p.id = ? AND p.is_active = 1
    `).get(equipment_id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });

    const id = uuidv4();
    const now = new Date().toISOString();
    const isOnline = socket.isUserOnline(receiver_id);

    db.prepare(`
      INSERT INTO messages (id, sender_id, receiver_id, content, type, equipment_id, equipment_data, delivered_at, created_at)
      VALUES (?, ?, ?, ?, 'equipment_card', ?, ?, ?, ?)
    `).run(id, req.user.id, receiver_id, `📦 ${equipment.title}`, equipment_id, JSON.stringify(equipment), isOnline ? now : null, now);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    emit(receiver_id, 'new_message', message);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /location — share location ──────────────────────────────────────────
router.post('/location', authenticate, (req, res) => {
  try {
    const { receiver_id, location_lat, location_lng, location_label } = req.body;
    if (!receiver_id || !location_lat || !location_lng) {
      return res.status(400).json({ success: false, message: 'receiver_id, lat, lng required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const isOnline = socket.isUserOnline(receiver_id);

    db.prepare(`
      INSERT INTO messages (id, sender_id, receiver_id, content, type, location_lat, location_lng, location_label, delivered_at, created_at)
      VALUES (?, ?, ?, ?, 'location', ?, ?, ?, ?, ?)
    `).run(id, req.user.id, receiver_id, '📍 Location', 'location', location_lat, location_lng, location_label || '', isOnline ? now : null, now);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    emit(receiver_id, 'new_message', message);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /search/conversations — search across messages ───────────────────────
router.get('/search/conversations', authenticate, (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;
    if (!q || !q.trim()) return res.json({ success: true, data: [] });

    const term = `%${q.trim()}%`;
    const results = db.prepare(`
      SELECT DISTINCT
        u.id as other_user_id, u.name, u.avatar, u.role,
        m.content as match_content, m.created_at as match_time
      FROM messages m
      JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id) AND u.id != ?
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
        AND (m.content LIKE ? OR u.name LIKE ?)
      ORDER BY m.created_at DESC
      LIMIT 20
    `).all(userId, userId, userId, term, term);

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /block — block a user ───────────────────────────────────────────────
router.post('/block', authenticate, (req, res) => {
  try {
    const { blocked_id, reason } = req.body;
    if (!blocked_id) return res.status(400).json({ success: false, message: 'blocked_id required' });
    const id = uuidv4();
    db.prepare(`
      INSERT OR REPLACE INTO blocked_users (id, blocker_id, blocked_id, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.user.id, blocked_id, reason || null, new Date().toISOString());
    res.json({ success: true, message: 'User blocked.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── DELETE /block/:userId — unblock a user ───────────────────────────────────
router.delete('/block/:userId', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?').run(req.user.id, req.params.userId);
    res.json({ success: true, message: 'User unblocked.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /block/status/:userId — check block status ──────────────────────────
router.get('/block/status/:userId', authenticate, (req, res) => {
  try {
    const iBlockedThem = !!db.prepare('SELECT id FROM blocked_users WHERE blocker_id=? AND blocked_id=?').get(req.user.id, req.params.userId);
    const theyBlockedMe = !!db.prepare('SELECT id FROM blocked_users WHERE blocker_id=? AND blocked_id=?').get(req.params.userId, req.user.id);
    res.json({ success: true, data: { iBlockedThem, theyBlockedMe } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /deliver/:messageId — mark a message as delivered ───────────────────
router.put('/deliver/:messageId', authenticate, (req, res) => {
  try {
    const now = new Date().toISOString();
    db.prepare('UPDATE messages SET delivered_at = ? WHERE id = ? AND delivered_at IS NULL').run(now, req.params.messageId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
