---
name: rentaway-api-conventions
description: >-
  Use this skill when adding, modifying, or debugging RentAway backend API
  routes. Covers REST endpoint structure, standard JSON response format, error
  handling conventions, authentication middleware usage, and how routes are
  registered in the Express server.
---

# RentAway — API Conventions

## Server Entry Point
`server/src/index.js` — Express app setup, CORS, static file serving, route mounting.

## Route Files Location
```
server/src/routes/
├── auth.js        → /api/auth/*
├── products.js    → /api/products/*
├── rentals.js     → /api/rentals/*
├── payments.js    → /api/payments/*
├── reviews.js     → /api/reviews/*
├── community.js   → /api/community/*
└── admin.js       → /api/admin/*
```

---

## Standard Response Format

### Success
```json
{ "success": true, "data": { ... } }
```
or for lists:
```json
{ "success": true, "data": [ ... ] }
```

### Error
```json
{ "success": false, "message": "Human-readable error message" }
```

---

## HTTP Status Codes Used

| Code | When |
|------|------|
| `200` | Successful GET / PUT / PATCH |
| `201` | Successful POST (resource created) |
| `400` | Bad request / validation error |
| `401` | Not authenticated (missing/invalid token) |
| `403` | Authenticated but not authorized (wrong role) |
| `404` | Resource not found |
| `500` | Internal server error |

---

## Authentication Middleware

Located at `server/src/middleware/auth.js`. Two middleware functions:

### `authenticate` — require valid JWT
```js
const { authenticate } = require('../middleware/auth');
router.get('/protected', authenticate, (req, res) => {
  // req.user = { id, email, role }
});
```

### `authorize(...roles)` — restrict to specific roles
```js
const { authenticate, authorize } = require('../middleware/auth');
router.get('/admin-only', authenticate, authorize('admin'), (req, res) => { ... });
router.post('/supplier-action', authenticate, authorize('supplier', 'admin'), (req, res) => { ... });
```

---

## Route Template

```js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// GET all (public)
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM my_table').all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create (protected)
router.post('/', authenticate, authorize('supplier'), (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const id = uuid();
    db.prepare('INSERT INTO my_table (id, name) VALUES (?, ?)').run(id, name);
    res.status(201).json({ success: true, data: { id, name } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
```

---

## Registering a New Route in index.js
```js
const myRoute = require('./routes/myRoute');
app.use('/api/my-route', myRoute);
```

---

## File Upload Routes
For routes using `multer` (image uploads), refer to the `rentaway-image-uploads` skill.

---

## Frontend API Calls
All API calls from the frontend are in `client/src/api/`. Axios is configured with the base URL `http://localhost:5000`. JWT token is attached via an Axios interceptor or passed in headers.
