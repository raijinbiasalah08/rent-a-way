require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

async function bootstrapAdmin() {
  const email = String(process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.INITIAL_ADMIN_PASSWORD || '');
  const name = String(process.env.INITIAL_ADMIN_NAME || 'RentAway Administrator').trim();

  if (!email || !password) {
    throw new Error('Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD before the initial deployment.');
  }
  if (password.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD must contain at least 12 characters.');
  }

  const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existingAdmin) {
    console.log('An admin account already exists; bootstrap skipped.');
    return;
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
  if (existingUser) {
    throw new Error('INITIAL_ADMIN_EMAIL belongs to an existing non-admin account; no role was changed.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, 'admin', ?)
  `).run(uuidv4(), name || 'RentAway Administrator', email, passwordHash, new Date().toISOString());

  console.log('Initial admin account created.');
}

bootstrapAdmin().catch(error => {
  console.error('Could not create the initial admin account:', error.message);
  process.exitCode = 1;
});
