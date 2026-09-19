---
name: rentaway-db-patterns
description: >-
  Use this skill when working with the RentAway SQLite database. Covers the
  schema conventions, query patterns using better-sqlite3, seed workflow,
  migration approach, and how to safely read/write data across the users,
  products, rentals, payments, reviews, and community tables.
---

# RentAway — Database Patterns

## Stack
- **Database:** SQLite via `better-sqlite3` (synchronous API)
- **Location:** `server/rentaway.db`
- **Seed script:** `server/src/db/seed.js` — run with `node src/db/seed.js` from `server/`

---

## Schema Overview

| Table | Key Columns |
|-------|-------------|
| `users` | `id` (UUID), `email`, `password_hash`, `role` (admin/supplier/customer), `name`, `created_at` |
| `products` | `id` (UUID), `supplier_id`, `name`, `description`, `price_per_day`, `category`, `image_url`, `status`, `created_at` |
| `rentals` | `id` (UUID), `product_id`, `customer_id`, `start_date`, `end_date`, `status` (pending/approved/rejected/returned), `total_price`, `created_at` |
| `payments` | `id` (UUID), `rental_id`, `customer_id`, `amount`, `method`, `status` (pending/paid/refunded), `created_at` |
| `reviews` | `id` (UUID), `product_id`, `customer_id`, `rating` (1–5), `comment`, `created_at` |
| `community` | `id` (UUID), `user_id`, `title`, `content`, `created_at` |

---

## Query Patterns (better-sqlite3)

### Setup — get DB instance
```js
// server/src/db/index.js (or wherever db is initialized)
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../../rentaway.db'));
module.exports = db;
```

### Read (single row)
```js
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
```

### Read (multiple rows)
```js
const products = db.prepare('SELECT * FROM products WHERE supplier_id = ?').all(supplierId);
```

### Insert
```js
const stmt = db.prepare(
  'INSERT INTO products (id, supplier_id, name, price_per_day, category, status) VALUES (?, ?, ?, ?, ?, ?)'
);
stmt.run(uuid(), supplierId, name, pricePerDay, category, 'active');
```

### Update
```js
db.prepare('UPDATE rentals SET status = ? WHERE id = ?').run('approved', rentalId);
```

### Delete
```js
db.prepare('DELETE FROM reviews WHERE id = ? AND customer_id = ?').run(reviewId, customerId);
```

### Transaction
```js
const transfer = db.transaction((rentalId, amount) => {
  db.prepare('UPDATE rentals SET status = ? WHERE id = ?').run('approved', rentalId);
  db.prepare('INSERT INTO payments (id, rental_id, amount, status) VALUES (?, ?, ?, ?)').run(uuid(), rentalId, amount, 'paid');
});
transfer(rentalId, totalPrice);
```

---

## ID Convention
All primary keys use UUIDs generated with `uuid` package:
```js
const { v4: uuid } = require('uuid');
const id = uuid();
```

---

## Seeding / Resetting
```bash
cd server
node src/db/seed.js
```
This drops and recreates all tables with fresh sample data including the test users in README.md.

---

## Common Pitfalls
- `better-sqlite3` is **synchronous** — do NOT use `async/await` with db calls.
- Always use **parameterized queries** (`?`) — never string-interpolate user input.
- `db.prepare().get()` returns `undefined` (not `null`) if no row found — always null-check.
- Date columns are stored as ISO strings (`YYYY-MM-DD`).
