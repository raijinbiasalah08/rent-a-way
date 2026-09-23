const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { isWithinRoxas, isValidRoxasBarangay, formatRoxasAddress } = require('../utils/roxasLocation');

const router = express.Router();

function validateAndNormalizeCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') {
    return { valid: false, lat: null, lng: null };
  }
  let lat = Number(latitude);
  let lng = Number(longitude);
  if (isNaN(lat) || isNaN(lng)) {
    return { valid: false, lat: null, lng: null };
  }
  // Prevent reversed coordinates: in Philippines lat is ~4.5 to 21.5, lng is ~116.5 to 127.0
  // If lat > 50 and lng < 50, swap them
  if (lat > 50 && lng < 50) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, lat: null, lng: null };
  }
  return {
    valid: true,
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6))
  };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `avatar-${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', phone, address, barangay, latitude, longitude } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    // Require suppliers/listers to set an accurate Roxas, Oriental Mindoro location
    const coords = validateAndNormalizeCoordinates(latitude, longitude);
    if (role === 'supplier') {
      if (!barangay || !isValidRoxasBarangay(barangay)) {
        return res.status(400).json({
          success: false,
          message: 'Suppliers must select an official Barangay in Roxas, Oriental Mindoro.'
        });
      }
      if (!coords.valid || !isWithinRoxas(coords.lat, coords.lng)) {
        return res.status(400).json({
          success: false,
          message: 'Only locations within Roxas, Oriental Mindoro are allowed.'
        });
      }
    } else if (coords.valid && !isWithinRoxas(coords.lat, coords.lng)) {
      return res.status(400).json({
        success: false,
        message: 'Only locations within Roxas, Oriental Mindoro are allowed.'
      });
    }

    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (checkUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const userLat = coords.valid ? coords.lat : null;
    const userLng = coords.valid ? coords.lng : null;

    const userPhone = phone ? String(phone).trim() : null;
    const userBarangay = barangay ? String(barangay).trim() : null;
    const userAddress = address ? String(address).trim() : (userBarangay ? `Brgy. ${userBarangay}, Roxas, Oriental Mindoro` : null);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, phone, address, barangay, latitude, longitude, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), email.trim(), passwordHash, role, userPhone, userAddress, userBarangay, userLat, userLng, createdAt);

    const user = { id, name: name.trim(), email: email.trim(), role, phone: userPhone, address: userAddress, barangay: userBarangay, latitude: userLat, longitude: userLng, created_at: createdAt };
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

router.post('/google', async (req, res) => {
  try {
    const { email, name, avatar, googleId, role = 'customer' } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const mappedRole = role === 'supplier' ? 'supplier' : 'customer';

    let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail);

    if (user) {
      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }

      // If user avatar is missing, save Google profile avatar
      if (!user.avatar && avatar) {
        db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, user.id);
        user.avatar = avatar;
      }
    } else {
      // Create new user record
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      const randomPassword = await bcrypt.hash(uuidv4() + Date.now(), 10);
      const defaultBarangay = 'San Aquilino';
      const defaultAddress = 'Brgy. San Aquilino, Roxas, Oriental Mindoro';
      const defaultLat = 12.5967;
      const defaultLng = 121.4841;

      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, avatar, address, barangay, latitude, longitude, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        cleanName,
        cleanEmail,
        randomPassword,
        mappedRole,
        avatar || null,
        defaultAddress,
        defaultBarangay,
        defaultLat,
        defaultLng,
        createdAt
      );

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }

    const { password_hash, ...userWithoutPassword } = user;
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'rentaway_super_secret_key_2024',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ success: true, data: { user: userWithoutPassword, token } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, phone, address, barangay, latitude, longitude, avatar, is_active, created_at FROM users WHERE id = ?').get(req.user.id);
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
    const { name, phone, address, barangay, latitude, longitude } = req.body;
    const coords = validateAndNormalizeCoordinates(latitude, longitude);

    if (coords.valid && !isWithinRoxas(coords.lat, coords.lng)) {
      return res.status(400).json({
        success: false,
        message: 'Only locations within Roxas, Oriental Mindoro are allowed.'
      });
    }

    let updateQuery = 'UPDATE users SET name = ?, phone = ?, address = ?';
    const updateParams = [
      name ? String(name).trim() : null,
      phone ? String(phone).trim() : null,
      address ? String(address).trim() : null
    ];

    if (barangay !== undefined) {
      updateQuery += ', barangay = ?';
      updateParams.push(barangay ? String(barangay).trim() : null);
    }

    if (latitude !== undefined && longitude !== undefined) {
      updateQuery += ', latitude = ?, longitude = ?';
      updateParams.push(coords.valid ? coords.lat : null, coords.valid ? coords.lng : null);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(req.user.id);

    db.prepare(updateQuery).run(...updateParams);

    // Cascading update: If supplier updates location, auto-update all their equipment listings
    const currentUser = db.prepare('SELECT role, barangay, address, latitude, longitude FROM users WHERE id = ?').get(req.user.id);
    if (currentUser?.role === 'supplier' && coords.valid && isWithinRoxas(coords.lat, coords.lng)) {
      db.prepare(`
        UPDATE products 
        SET location = ?, barangay = ?, latitude = ?, longitude = ? 
        WHERE supplier_id = ? AND is_active = 1
      `).run(
        address ? address.trim() : (currentUser.address || ''),
        barangay ? barangay.trim() : (currentUser.barangay || 'Poblacion'),
        coords.lat,
        coords.lng,
        req.user.id
      );
    }

    const user = db.prepare('SELECT id, name, email, role, phone, address, barangay, latitude, longitude, avatar, is_active, created_at FROM users WHERE id = ?').get(req.user.id);
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
