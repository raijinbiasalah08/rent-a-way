const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db/database');

const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const rentalsRoutes = require('./routes/rentals');
const paymentsRoutes = require('./routes/payments');
const reviewsRoutes = require('./routes/reviews');
const communityRoutes = require('./routes/community');
const adminRoutes = require('./routes/admin');
const favoritesRoutes = require('./routes/favorites');
const notificationsRoutes = require('./routes/notifications');
const messagesRoutes = require('./routes/messages');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/rentals', rentalsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/messages', messagesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;
const http = require('http');
const socket = require('./socket');

const server = http.createServer(app);
socket.init(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
