const express = require("express");
require("express-async-errors");
const cors = require("cors");
require("dotenv").config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error(
    "Set JWT_SECRET to a random value of at least 32 characters.",
  );
}
if (process.env.NODE_ENV === "production") {
  const missing = [
    "DATABASE_URL",
    "RESEND_API_KEY",
    "MAIL_FROM",
    "GOOGLE_CLIENT_ID",
    "CLIENT_ORIGIN",
    "FRONTEND_URL",
  ].filter((key) => !process.env[key]);
  if (missing.length)
    throw new Error(`Missing production configuration: ${missing.join(", ")}`);
  if (/^(replace|change|test|your[_-])/i.test(process.env.JWT_SECRET))
    throw new Error("Use a random production JWT_SECRET, not an example value");
  for (const origin of [
    process.env.FRONTEND_URL,
    ...process.env.CLIENT_ORIGIN.split(","),
  ]) {
    const url = new URL(origin.trim());
    if (
      url.protocol !== "https:" ||
      url.origin !== origin.trim().replace(/\/$/, "")
    )
      throw new Error(
        "Production frontend origins must be HTTPS origins without paths",
      );
  }
}

const uploadsDir = require("./utils/uploads");
const db = require("./db/database");

const authRoutes = require("./routes/auth");
const productsRoutes = require("./routes/products");
const rentalsRoutes = require("./routes/rentals");
const reviewsRoutes = require("./routes/reviews");
const communityRoutes = require("./routes/community");
const adminRoutes = require("./routes/admin");
const favoritesRoutes = require("./routes/favorites");
const notificationsRoutes = require("./routes/notifications");
const messagesRoutes = require("./routes/messages");

const app = express();
app.set("trust proxy", 1);
app.use(
  require("helmet")({ crossOriginResourcePolicy: { policy: "cross-origin" } }),
);
app.use((req, res, next) => {
  req.id = require("node:crypto").randomUUID();
  res.set("X-Request-ID", req.id);
  next();
});

// Middleware
const localClientOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const configuredClientOrigins = new Set(
  (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
);
app.use(
  cors({
    maxAge: 600,
    origin: (origin, callback) => {
      if (
        !origin ||
        localClientOrigins.has(origin) ||
        configuredClientOrigins.has(origin.replace(/\/$/, ""))
      ) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);
// Preflight is handled by CORS first; rate-limit errors retain CORS headers.
app.use(
  require("express-rate-limit").rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again shortly.",
    },
  }),
);
app.use(express.json({ limit: "256kb" }));
const writeLimit = require("express-rate-limit").rateLimit({
  windowMs: 60000,
  limit: 30,
  skip: (req) => req.method === "GET",
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many actions. Wait a minute and try again.",
  },
});
app.use(
  ["/api/messages", "/api/admin/complaints", "/api/community"],
  writeLimit,
);
app.get("/uploads/:filename", async (req, res, next) => {
  const { filename } = req.params;
  if (require("node:path").basename(filename) !== filename) return next();
  const asset = await db
    .prepare("SELECT content_type, data FROM uploaded_assets WHERE filename = ?")
    .get(filename);
  if (asset?.data) {
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.set("X-Content-Type-Options", "nosniff");
    return res.type(asset.content_type || "application/octet-stream").send(asset.data);
  }
  return res.sendFile(require("node:path").join(uploadsDir, filename), (error) => {
    if (error && !res.headersSent) next();
  });
});

app.get("/health", (req, res) => {
  res.json({ success: true, status: "ok" });
});
app.get("/ready", async (req, res, next) => {
  try {
    await db.prepare("SELECT 1 AS ok").get();
    res.json({ success: true, status: "ready" });
  } catch (error) {
    res.status(503).json({ success: false, message: "Database unavailable" });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/rentals", rentalsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api", (req, res) =>
  res.status(404).json({ success: false, message: "Endpoint not found" }),
);

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  console.error({ requestId: req.id, status, code: err.code || err.name });
  res.status(status).json({
    success: false,
    message:
      status >= 500 ? "Something went wrong. Please try again." : err.message,
  });
});

const PORT = process.env.PORT || 5000;
const http = require("http");
const socket = require("./socket");

async function start(port = PORT) {
  await db.initialize();
  const server = http.createServer(app);
  socket.init(server);
  await new Promise((resolve) => server.listen(port, resolve));
  return server;
}
if (require.main === module)
  start()
    .then((server) =>
      console.log(`Server is running on port ${server.address().port}`),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
module.exports = { app, start };
