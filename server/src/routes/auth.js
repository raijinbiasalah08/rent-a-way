const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `avatar-${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', phone, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (checkUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, phone, address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, email, passwordHash, role, phone, address, createdAt);

    const user = { id, name, email, role, phone, address, created_at: createdAt };
    const token = jwt.sign({ id, role }, process.env.JWT_SECRET || 'rentaway_super_secret_key_2024', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.status(201).json({ success: true, data: { user, token } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const { password_hash, ...userWithoutPassword } = user;
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'rentaway_super_secret_key_2024', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.json({ success: true, data: { user: userWithoutPassword, token } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, phone, address, avatar, is_active, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/profile', authenticate, (req, res) => {
  try {
    const { name, phone, address } = req.body;
    db.prepare('UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?').run(name, phone, address, req.user.id);
    const user = db.prepare('SELECT id, name, email, role, phone, address, avatar, is_active, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/profile/avatar', authenticate, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, req.user.id);
    const user = db.prepare('SELECT id, name, email, role, phone, address, avatar, is_active, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const resetToken = uuidv4();
    // Simulate token saving and emailing
    res.json({ success: true, resetToken, message: 'Password reset token generated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
