const { Server } = require("socket.io");
const { verifySession } = require("./middleware/auth");
const db = require("./db/database");
let io;
const online = new Map();
async function canContact(a, b) {
  if (typeof b !== "string" || a === b) return false;
  const blocked = await db
    .prepare(
      "SELECT id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)",
    )
    .get(a, b, b, a);
  const conversation = await db
    .prepare(
      "SELECT id FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) LIMIT 1",
    )
    .get(a, b, b, a);
  return !blocked && Boolean(conversation);
}
module.exports = {
  init(server) {
    const origins = (
      process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
    )
      .split(",")
      .map((s) => s.trim());
    io = new Server(server, {
      cors: { origin: origins, credentials: true },
      maxHttpBufferSize: 16384,
    });
    io.use(async (socket, next) => {
      try {
        socket.user = await verifySession(socket.handshake.auth?.token);
        next();
      } catch {
        next(new Error("Authentication required"));
      }
    });
    io.on("connection", (socket) => {
      const id = socket.user.id;
      socket.join(`user:${id}`);
      online.set(id, (online.get(id) || 0) + 1);
      const safe =
        (handler) =>
        async (payload = {}) => {
          try {
            await verifySession(socket.handshake.auth.token);
            await handler(payload || {});
          } catch {
            socket.disconnect(true);
          }
        };
      for (const event of ["typing", "stop_typing"])
        socket.on(
          event,
          safe(async ({ receiverId }) => {
            if (await canContact(id, receiverId))
              io.to(`user:${receiverId}`).emit(event, { senderId: id });
          }),
        );
      socket.on(
        "message_delivered",
        safe(async ({ messageId }) => {
          const message = await db
            .prepare(
              "SELECT sender_id FROM messages WHERE id = ? AND receiver_id = ?",
            )
            .get(messageId, id);
          if (!message || !(await canContact(id, message.sender_id))) return;
          const deliveredAt = new Date().toISOString();
          await db
            .prepare(
              "UPDATE messages SET delivered_at = COALESCE(delivered_at, ?) WHERE id = ?",
            )
            .run(deliveredAt, messageId);
          io.to(`user:${message.sender_id}`).emit("message_delivered", {
            messageId,
            deliveredAt,
          });
        }),
      );
      socket.on(
        "messages_read",
        safe(async ({ senderId }) => {
          if (!(await canContact(id, senderId))) return;
          const readAt = new Date().toISOString();
          await db
            .prepare(
              "UPDATE messages SET is_read = 1, read_at = ? WHERE receiver_id = ? AND sender_id = ?",
            )
            .run(readAt, id, senderId);
          io.to(`user:${senderId}`).emit("messages_read", {
            readerId: id,
            readAt,
          });
        }),
      );
      socket.on(
        "check_online",
        safe(async ({ userIds }) => {
          const statuses = {};
          for (const other of Array.isArray(userIds)
            ? userIds.slice(0, 100)
            : [])
            if (await canContact(id, other))
              statuses[other] = online.has(other);
          socket.emit("online_statuses", statuses);
        }),
      );
      socket.on("disconnect", () => {
        const count = (online.get(id) || 1) - 1;
        if (count) online.set(id, count);
        else online.delete(id);
      });
    });
    return io;
  },
  getIO() {
    if (!io) throw new Error("Sockets unavailable");
    return io;
  },
  getUserSocketId(id) {
    return online.has(id) ? `user:${id}` : undefined;
  },
  isUserOnline(id) {
    return online.has(id);
  },
  disconnectUser(id) {
    io?.in(`user:${id}`).disconnectSockets(true);
  },
};
