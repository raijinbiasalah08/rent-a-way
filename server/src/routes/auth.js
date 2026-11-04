const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { isWithinRoxas, isValidRoxasBarangay, formatRoxasAddress } = require('../utils/roxasLocation');
const { verifyGoogleIdToken } = require('../utils/googleIdentity');
const uploadsDir = require('../utils/uploads');

const router = express.Router();

db.exec(`
  CREATE TABLE IF NOT EXISTS google_identities (
    google_sub TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

function runInTransaction(callback) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Preserve the original database error if rollback also fails.
    }
    throw error;
  }
}

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
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `avatar-${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', phone, address, barangay, latitude, longitude } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const requestedRole = String(role).trim().toLowerCase();
    if (!['customer', 'renter', 'supplier'].includes(requestedRole)) {
      return res.status(400).json({ success: false, message: 'Choose either the renter or supplier role.' });
    }
    const assignedRole = requestedRole === 'supplier' ? 'supplier' : 'customer';

    // Require suppliers/listers to set an accurate Roxas, Oriental Mindoro location
    const coords = validateAndNormalizeCoordinates(latitude, longitude);
    if (assignedRole === 'supplier') {
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
    `).run(id, name.trim(), email.trim(), passwordHash, assignedRole, userPhone, userAddress, userBarangay, userLat, userLng, createdAt);

    const user = { id, name: name.trim(), email: email.trim(), role: assignedRole, phone: userPhone, address: userAddress, barangay: userBarangay, latitude: userLat, longitude: userLng, created_at: createdAt };
    const token = jwt.sign({ id, role: assignedRole }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

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
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.json({ success: true, data: { user: userWithoutPassword, token } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/google/config', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({
      success: false,
      message: 'Google sign-in is not configured. Add GOOGLE_CLIENT_ID to server/.env.'
    });
  }
  res.json({ success: true, data: { clientId } });
});

router.post('/google', async (req, res) => {
  let profile;
  try {
    profile = await verifyGoogleIdToken(req.body?.credential);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Google sign-in could not be verified.'
    });
  }

  const requestedRole = req.body?.role;
  const createdAt = new Date().toISOString();

  try {
    const result = runInTransaction(() => {
      const linkedIdentity = db.prepare('SELECT user_id FROM google_identities WHERE google_sub = ?').get(profile.sub);
      let user = linkedIdentity
        ? db.prepare('SELECT * FROM users WHERE id = ?').get(linkedIdentity.user_id)
        : db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(profile.email);

      if (user) {
        if (!user.is_active) return { inactive: true };

        const existingLink = db.prepare('SELECT user_id FROM google_identities WHERE google_sub = ?').get(profile.sub);
        if (existingLink && existingLink.user_id !== user.id) return { identityConflict: true };
        if (!existingLink) {
          db.prepare('INSERT INTO google_identities (google_sub, user_id, created_at) VALUES (?, ?, ?)')
            .run(profile.sub, user.id, createdAt);
        }

        if (!user.avatar && profile.picture) {
          db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(profile.picture, user.id);
          user.avatar = profile.picture;
        }
        return { user };
      }

      if (!requestedRole) return { needsRoleSelection: true };
      if (!['customer', 'renter', 'supplier'].includes(requestedRole)) return { invalidRole: true };

      const role = requestedRole === 'supplier' ? 'supplier' : 'customer';
      const id = uuidv4();
      const name = profile.name || profile.email.split('@')[0];
      const passwordHash = bcrypt.hashSync(`${uuidv4()}${Date.now()}`, 10);
      const defaultBarangay = 'San Aquilino';
      const defaultAddress = formatRoxasAddress(defaultBarangay);

      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, avatar, address, barangay, latitude, longitude, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, profile.email, passwordHash, role, profile.picture, defaultAddress, defaultBarangay, 12.5967, 121.4841, createdAt);

      db.prepare('INSERT INTO google_identities (google_sub, user_id, created_at) VALUES (?, ?, ?)')
        .run(profile.sub, id, createdAt);
      return { user: db.prepare('SELECT * FROM users WHERE id = ?').get(id) };
    });

    if (result.needsRoleSelection) {
      return res.json({
        success: true,
        data: {
          needsRoleSelection: true,
          googleUser: { sub: profile.sub, email: profile.email, name: profile.name, picture: profile.picture }
        }
      });
    }
    if (result.inactive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    if (result.identityConflict) {
      return res.status(409).json({ success: false, message: 'This Google account is linked to another Rent-A-Way account.' });
    }
    if (result.invalidRole) {
      return res.status(400).json({ success: false, message: 'Choose either the renter or supplier role.' });
    }

    const { password_hash, ...userWithoutPassword } = result.user;
    const token = jwt.sign(
      { id: result.user.id, role: result.user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({ success: true, data: { user: userWithoutPassword, token } });
  } catch (error) {
    console.error('Google account sign-in failed:', error.message);
    res.status(500).json({ success: false, message: 'Could not finish Google sign-in. Please try again.' });
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
