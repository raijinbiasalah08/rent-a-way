const { Server } = require('socket.io');

let io;
const userSockets = new Map(); // Maps user_id -> socket_id

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('authenticate', (userId) => {
        if (userId) {
          userSockets.set(userId, socket.id);
          socket.userId = userId;
          console.log(`User ${userId} authenticated with socket ${socket.id}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (socket.userId) {
          userSockets.delete(socket.userId);
        }
      });

      // Typing indicators
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
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
  getUserSocketId: (userId) => {
    return userSockets.get(userId);
  }
};
