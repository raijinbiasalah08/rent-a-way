# RentAway - Find Better Ways to Save

A full-stack rental marketplace platform built with React + Node.js.

## Quick Start

### 1. Start the Backend Server
```
cd server
node src/index.js
```
Backend runs at: http://localhost:5000

### 2. Start the Frontend Dev Server
```
cd client
npm run dev
```
Frontend runs at: http://localhost:5173

## Test Credentials

| Role     | Email                      | Password     |
|----------|----------------------------|--------------|
| Admin    | admin@rentaway.com         | admin123     |
| Supplier | supplier1@rentaway.com     | supplier123  |
| Supplier | supplier2@rentaway.com     | supplier123  |
| Customer | customer1@rentaway.com     | customer123  |
| Customer | customer2@rentaway.com     | customer123  |

## Project Structure

```
rent a way 2/
|- client/       React + Vite frontend (port 5173)
|- server/       Node.js + Express backend (port 5000)
|  |- rentaway.db   SQLite database
|  +- uploads/      Product images
+- README.md
```

## Re-seed Database

To reset to fresh sample data:
```
cd server
node src/db/seed.js
```
