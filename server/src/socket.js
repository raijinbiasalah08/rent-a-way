const { Server } = require('socket.io');

let io;
const userSockets = new Map(); // userId -> socketId
const userOnlineSince = new Map(); // userId -> ISO timestamp

module.exports = {
  init: (httpServer) => {
    const allowedOrigins = new Set(
      (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
        .split(',')
        .map(origin => origin.trim().replace(/\/$/, ''))
        .filter(Boolean)
    );

    io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) return callback(null, true);
          return callback(new Error('Origin is not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // ── Authentication & online presence ────────────────────────────────
      socket.on('authenticate', (userId) => {
        if (!userId) return;
        userSockets.set(userId, socket.id);
        userOnlineSince.set(userId, new Date().toISOString());
        socket.userId = userId;
        console.log(`User ${userId} authenticated with socket ${socket.id}`);

        // Broadcast online status to everyone
        socket.broadcast.emit('user_online', { userId });
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (socket.userId) {
          userSockets.delete(socket.userId);
          const lastSeen = new Date().toISOString();
          userOnlineSince.delete(socket.userId);
          // Broadcast offline + last seen to everyone
          socket.broadcast.emit('user_offline', { userId: socket.userId, lastSeen });
        }
      });

      // ── Typing indicators ────────────────────────────────────────────────
      socket.on('typing', ({ receiverId }) => {
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('typing', { senderId: socket.userId });
        }
      });

      socket.on('stop_typing', ({ receiverId }) => {
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('stop_typing', { senderId: socket.userId });
        }
      });

      // ── Message delivered receipt ────────────────────────────────────────
      socket.on('message_delivered', ({ messageId, senderId }) => {
        const senderSocketId = userSockets.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_delivered', { messageId, deliveredAt: new Date().toISOString() });
        }
      });

      // ── Message read receipt ─────────────────────────────────────────────
      socket.on('messages_read', ({ senderId, readAt }) => {
        const senderSocketId = userSockets.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_read', { readerId: socket.userId, readAt });
        }
      });

      // ── Online status query ──────────────────────────────────────────────
      socket.on('check_online', ({ userIds }) => {
        const statuses = {};
        (userIds || []).forEach(uid => {
          statuses[uid] = userSockets.has(uid);
        });
        socket.emit('online_statuses', statuses);
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) throw new Error('Socket.io not initialized!');
    return io;
  },
  getUserSocketId: (userId) => userSockets.get(userId),
  isUserOnline: (userId) => userSockets.has(userId),
};
