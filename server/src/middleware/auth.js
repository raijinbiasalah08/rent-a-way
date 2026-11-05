const jwt = require("jsonwebtoken");
const db = require("../db/database");

const verifySession = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
  });
  const user = await db
    .prepare(
      "SELECT id, name, email, role, is_active, token_version FROM users WHERE id = ?",
    )
    .get(decoded.id);
  if (!user?.is_active || (decoded.version || 0) !== user.token_version)
    throw Object.assign(new Error("Session expired"), { status: 401 });
  return user;
};

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    req.user = await verifySession(token);
    next();
  } catch (err) {
    if (
      err.status !== 401 &&
      !["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
        err.name,
      )
    )
      return next(err);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permissions",
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize, verifySession };
