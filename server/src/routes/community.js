const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    let { type, page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let query = 'SELECT c.*, u.name as author_name, u.avatar as author_avatar FROM community_posts c JOIN users u ON c.user_id = u.id';
    let countQuery = 'SELECT COUNT(*) as total FROM community_posts c';
    const params = [];

    if (type) {
      query += ' WHERE c.type = ?';
      countQuery += ' WHERE c.type = ?';
      params.push(type);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    const posts = db.prepare(query).all(...params, limit, offset);
    const { total } = db.prepare(countQuery).get(...params);

    res.json({ success: true, data: { posts, total, page, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authenticate, (req, res) => {
  try {
    const { content, type = 'experience' } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO community_posts (id, user_id, content, type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.user.id, content, type, new Date().toISOString());

    const post = db.prepare('SELECT c.*, u.name as author_name, u.avatar as author_avatar FROM community_posts c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(id);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/like', authenticate, (req, res) => {
  try {
    db.prepare('UPDATE community_posts SET likes = likes + 1 WHERE id = ?').run(req.params.id);
    const post = db.prepare('SELECT likes FROM community_posts WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
