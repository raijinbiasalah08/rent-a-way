module.exports = {
  sql: `
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
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (customer_id) REFERENCES users(id)
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


CREATE TABLE IF NOT EXISTS blocked_users (id TEXT PRIMARY KEY, blocker_id TEXT NOT NULL REFERENCES users(id), blocked_id TEXT NOT NULL REFERENCES users(id), reason TEXT, created_at TEXT NOT NULL, UNIQUE(blocker_id, blocked_id));
CREATE TABLE IF NOT EXISTS roxas_barangays (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, description TEXT);
CREATE TABLE IF NOT EXISTS google_identities (google_sub TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS community_likes (post_id TEXT NOT NULL REFERENCES community_posts(id), user_id TEXT NOT NULL REFERENCES users(id), PRIMARY KEY(post_id, user_id));
CREATE TABLE IF NOT EXISTS admin_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL, resource_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
`,
  columns: [
    ["products", "location", "TEXT"],
    ["products", "latitude", "REAL"],
    ["products", "longitude", "REAL"],
    ["products", "barangay", "TEXT"],
    ["users", "latitude", "REAL"],
    ["users", "longitude", "REAL"],
    ["users", "barangay", "TEXT"],
    ["reviews", "image_url", "TEXT"],
    ["messages", "type", "TEXT NOT NULL DEFAULT 'text'"],
    ["messages", "image_url", "TEXT"],
    ["messages", "reply_to_id", "TEXT"],
    ["messages", "reply_preview", "TEXT"],
    ["messages", "location_lat", "REAL"],
    ["messages", "location_lng", "REAL"],
    ["messages", "location_label", "TEXT"],
    ["messages", "equipment_id", "TEXT"],
    ["messages", "equipment_data", "TEXT"],
    ["messages", "delivered_at", "TEXT"],
    ["messages", "read_at", "TEXT"],
    ["users", "token_version", "INTEGER NOT NULL DEFAULT 0"],
    ["reviews", "rental_id", "TEXT REFERENCES rentals(id)"],
    ["complaints", "resolved_at", "TEXT"],
    ["complaints", "resolved_by", "TEXT REFERENCES users(id)"],
  ],
};
