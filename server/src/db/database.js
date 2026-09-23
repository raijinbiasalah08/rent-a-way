const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../rentaway.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Initialize schema
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  phone TEXT,
  address TEXT,
  latitude REAL,
  longitude REAL,
  avatar TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price_per_day REAL NOT NULL,
  min_days INTEGER NOT NULL DEFAULT 1,
  max_days INTEGER NOT NULL DEFAULT 30,
  availability TEXT NOT NULL DEFAULT 'available',
  specs TEXT,
  location TEXT,
  latitude REAL,
  longitude REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  url TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS rentals (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_price REAL NOT NULL,
  security_deposit REAL NOT NULL DEFAULT 0,
  payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (customer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  rental_id TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_ref TEXT,
  paid_at TEXT,
  FOREIGN KEY (rental_id) REFERENCES rentals(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (customer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'experience',
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  reported_id TEXT,
  subject TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  FOREIGN KEY (reporter_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  product_id TEXT,
  content TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- High-Performance Search (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  id UNINDEXED,
  title,
  description,
  category,
  content='products',
  content_rowid='rowid'
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, id, title, description, category) VALUES (new.rowid, new.id, new.title, new.description, new.category);
END;
CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, id, title, description, category) VALUES('delete', old.rowid, old.id, old.title, old.description, old.category);
END;
CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, id, title, description, category) VALUES('delete', old.rowid, old.id, old.title, old.description, old.category);
  INSERT INTO products_fts(rowid, id, title, description, category) VALUES (new.rowid, new.id, new.title, new.description, new.category);
END;
`);

// Auto-migrate schema columns on startup
function ensureColumn(table, column, definition) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!columns.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  } catch (err) {
    // Ignore migration collision
  }
}

ensureColumn('products', 'location', 'TEXT');
ensureColumn('products', 'latitude', 'REAL');
ensureColumn('products', 'longitude', 'REAL');
ensureColumn('products', 'barangay', 'TEXT');
ensureColumn('users', 'latitude', 'REAL');
ensureColumn('users', 'longitude', 'REAL');
ensureColumn('users', 'barangay', 'TEXT');
ensureColumn('rentals', 'security_deposit', 'REAL NOT NULL DEFAULT 0');
ensureColumn('rentals', 'payment_intent_id', 'TEXT');
ensureColumn('reviews', 'image_url', 'TEXT');
ensureColumn('payments', 'receipt_image', 'TEXT');
ensureColumn('payments', 'sender_name', 'TEXT');
ensureColumn('payments', 'sender_phone', 'TEXT');
ensureColumn('users', 'gcash_number', 'TEXT');
ensureColumn('users', 'gcash_name', 'TEXT');
ensureColumn('users', 'gcash_qr', 'TEXT');
ensureColumn('users', 'maya_number', 'TEXT');
ensureColumn('users', 'maya_name', 'TEXT');
ensureColumn('users', 'maya_qr', 'TEXT');

// Roxas, Oriental Mindoro Reference Table & Seed
db.exec(`
CREATE TABLE IF NOT EXISTS roxas_barangays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  description TEXT
);
`);

const { ROXAS_BARANGAYS, isWithinRoxas } = require('../utils/roxasLocation');

try {
  const countBarangays = db.prepare('SELECT count(*) as c FROM roxas_barangays').get().c;
  if (countBarangays === 0) {
    const insertStmt = db.prepare('INSERT OR IGNORE INTO roxas_barangays (name, latitude, longitude, description) VALUES (?, ?, ?, ?)');
    for (const b of ROXAS_BARANGAYS) {
      insertStmt.run(b.name, b.lat, b.lng, b.description);
    }
  }
} catch (e) {
  console.warn('Barangays seed warning:', e.message);
}

// Ensure FTS5 index is clean and synced
try {
  db.exec("INSERT INTO products_fts(products_fts) VALUES('rebuild');");
} catch (e) {
  // Ignore
}

module.exports = db;

