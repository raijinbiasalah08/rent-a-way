const express = require("express");
const { randomUUID: uuidv4 } = require("node:crypto");
const db = require("../db/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
const { paginated } = require("../utils/pagination");
const { z, validate } = require("../middleware/validation");
async function audit(req, action, id) {
  await db
    .prepare(
      "INSERT INTO admin_audit (id,actor_id,action,resource_id,created_at) VALUES (?,?,?,?,?)",
    )
    .run(uuidv4(), req.user.id, action, id, new Date().toISOString());
}
async function changeUser(req, changes) {
  return db.transaction(async () => {
    if (db.dialect === "postgres")
      await db.exec("SELECT pg_advisory_xact_lock(7834522)");
    const current = await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(req.params.id);
    if (!current)
      throw Object.assign(new Error("User not found"), { status: 404 });
    const next = { ...current, ...changes };
    if (
      req.user.id === current.id &&
      (!next.is_active || next.role !== "admin")
    )
      throw Object.assign(
        new Error("You cannot deactivate or demote your own admin account"),
        { status: 400 },
      );
    if (
      current.role === "admin" &&
      current.is_active &&
      (!next.is_active || next.role !== "admin")
    ) {
      const { count } = await db
        .prepare(
          "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1",
        )
        .get();
      if (count <= 1)
        throw Object.assign(
          new Error("Keep at least one active administrator"),
          { status: 400 },
        );
    }
    await db
      .prepare("UPDATE users SET name = ?,role = ?,is_active = ? WHERE id = ?")
      .run(next.name, next.role, next.is_active, current.id);
    await audit(req, "user_updated", current.id);
    return {
      id: current.id,
      name: next.name,
      role: next.role,
      is_active: next.is_active,
      email: next.email,
    };
  });
}

router.post(
  "/complaints",
  authenticate,
  validate(
    z.object({
      reported_id: z.string().uuid().nullable().optional(),
      subject: z.string().trim().min(3).max(150),
      details: z.string().trim().min(5).max(5000),
    }),
  ),
  async (req, res) => {
    try {
      const { reported_id, subject, details } = req.body;
      if (
        reported_id &&
        (reported_id === req.user.id ||
          !(await db
            .prepare("SELECT id FROM users WHERE id = ?")
            .get(reported_id)))
      )
        return res
          .status(400)
          .json({ success: false, message: "Choose a valid reported user" });
      const id = uuidv4();
      await db
        .prepare(
          `
      INSERT INTO complaints (id, reporter_id, reported_id, subject, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
        )
        .run(
          id,
          req.user.id,
          reported_id,
          subject,
          details,
          new Date().toISOString(),
        );
      res
        .status(201)
        .json({ success: true, message: "Complaint filed successfully" });
    } catch (error) {
      console.error({ route: req.originalUrl, code: error.code || error.name });
      res.status(500).json({
        success: false,
        message: "Unable to complete the request. Please try again.",
      });
    }
  },
);

// ── PUBLIC stats (no auth required) — used by the homepage stats strip ──────
router.get("/public-stats", async (req, res) => {
  try {
    const totalProducts = (
      await db
        .prepare("SELECT COUNT(*) as c FROM products WHERE is_active = 1")
        .get()
    ).c;
    const totalSuppliers = (
      await db
        .prepare(
          "SELECT COUNT(*) as c FROM users WHERE role = 'supplier' AND is_active = 1",
        )
        .get()
    ).c;
    const avgRating = (
      await db.prepare("SELECT AVG(rating) as avg FROM reviews").get()
    ).avg;
    const completedRentals = (
      await db
        .prepare(
          "SELECT COUNT(*) as c FROM rentals WHERE status IN ('completed', 'returned')",
        )
        .get()
    ).c;

    res.json({
      success: true,
      data: {
        totalProducts,
        totalSuppliers,
        avgRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
        completedRentals,
      },
    });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// All routes below are admin only
router.use(authenticate, authorize("admin"));
router.post(
  "/users",
  validate(
    z.object({
      name: z.string().trim().min(2).max(100),
      email: require("../middleware/validation").email,
      password: require("../middleware/validation").password,
      role: z.enum(["customer", "supplier", "admin"]),
    }),
  ),
  async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;
      if (
        await db.prepare("SELECT id FROM users WHERE LOWER(email)=?").get(email)
      )
        return res
          .status(409)
          .json({ success: false, message: "Email already registered" });
      const id = uuidv4();
      await db
        .prepare(
          "INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
        )
        .run(
          id,
          name,
          email,
          await require("bcryptjs").hash(password, 12),
          role,
          new Date().toISOString(),
        );
      await audit(req, "user_created", id);
      res.status(201).json({ success: true, data: { id, name, email, role } });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/stats", async (req, res) => {
  try {
    const totalUsers = (
      await db.prepare("SELECT COUNT(*) as c FROM users").get()
    ).c;
    const totalProducts = (
      await db
        .prepare("SELECT COUNT(*) as c FROM products WHERE is_active = 1")
        .get()
    ).c;
    const totalRentals = (
      await db.prepare("SELECT COUNT(*) as c FROM rentals").get()
    ).c;
    const activeRentals = (
      await db
        .prepare("SELECT COUNT(*) as c FROM rentals WHERE status = 'active'")
        .get()
    ).c;
    const pendingRentals = (
      await db
        .prepare("SELECT COUNT(*) as c FROM rentals WHERE status = 'pending'")
        .get()
    ).c;
    const openComplaints = (
      await db
        .prepare("SELECT COUNT(*) as c FROM complaints WHERE status = 'open'")
        .get()
    ).c;
    const completedRentals = (
      await db
        .prepare("SELECT COUNT(*) AS c FROM rentals WHERE status = 'completed'")
        .get()
    ).c;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalRentals,
        activeRentals,
        pendingRentals,
        openComplaints,
        completedRentals,
      },
    });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.get("/users", async (req, res) => {
  try {
    const { search, role } = req.query;
    let query =
      "SELECT id, name, email, role, phone, address, is_active, created_at FROM users WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (name LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      query += " AND role = ?";
      params.push(role);
    }

    res.json(
      await paginated(query + " ORDER BY created_at DESC,id", params, req),
    );
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.put(
  "/users/:id",
  validate(
    z.object({
      name: z.string().trim().min(2).max(100),
      role: z.enum(["admin", "supplier", "customer"]),
      is_active: z.union([z.literal(0), z.literal(1)]),
    }),
  ),
  async (req, res, next) => {
    try {
      const user = await changeUser(req, req.body);
      require("../socket").disconnectUser(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/users/:id", async (req, res, next) => {
  try {
    await changeUser(req, { is_active: 0 });
    require("../socket").disconnectUser(req.params.id);
    res.json({ success: true, message: "User deactivated" });
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req, res) => {
  try {
    res.json(
      await paginated(
        `
      SELECT p.*, u.name as supplier_name,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p JOIN users u ON p.supplier_id = u.id
      WHERE LOWER(p.title) LIKE LOWER(?) OR LOWER(u.name) LIKE LOWER(?) ORDER BY p.created_at DESC,p.id
    `,
        [
          `%${String(req.query.search || "").slice(0, 200)}%`,
          `%${String(req.query.search || "").slice(0, 200)}%`,
        ],
        req,
      ),
    );
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.put("/products/:id/toggle", async (req, res) => {
  try {
    const result = await db.transaction(async () => {
      const changed = await db
        .prepare(
          "UPDATE products SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?",
        )
        .run(req.params.id);
      if (changed.changes) await audit(req, "product_toggled", req.params.id);
      return changed;
    });
    if (!result.changes)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product status toggled" });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.get("/rentals", async (req, res) => {
  try {
    const term = `%${String(req.query.search || "").slice(0, 200)}%`;
    res.json(
      await paginated(
        `
      SELECT r.*, p.title AS product_title, u1.name as customer_name, u2.name as supplier_name
      FROM rentals r
      JOIN products p ON r.product_id = p.id
      JOIN users u1 ON r.customer_id = u1.id
      JOIN users u2 ON p.supplier_id = u2.id
      WHERE (? = '' OR r.status = ?) AND (LOWER(p.title) LIKE LOWER(?) OR LOWER(u1.name) LIKE LOWER(?) OR LOWER(u2.name) LIKE LOWER(?)) ORDER BY r.created_at DESC,r.id
    `,
        [req.query.status || "", req.query.status || "", term, term, term],
        req,
      ),
    );
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.get("/complaints", async (req, res) => {
  try {
    res.json(
      await paginated(
        `
      SELECT c.*, u.name as reporter_name 
      FROM complaints c 
      JOIN users u ON c.reporter_id = u.id
      WHERE (? = '' OR c.status = ?) ORDER BY c.created_at DESC,c.id
    `,
        [req.query.status || "", req.query.status || ""],
        req,
      ),
    );
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.put("/complaints/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "investigating", "resolved", "dismissed"].includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid complaint status" });
    const closed = ["resolved", "dismissed"].includes(status);
    const result = await db
      .prepare(
        "UPDATE complaints SET status = ?, resolved_by = ?, resolved_at = ? WHERE id = ?",
      )
      .run(
        status,
        closed ? req.user.id : null,
        closed ? new Date().toISOString() : null,
        req.params.id,
      );
    if (!result.changes)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    await audit(req, "complaint_updated", req.params.id);
    res.json({ success: true, message: "Complaint status updated" });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.get("/reports", async (req, res) => {
  try {
    // Top products by rentals
    const topProducts = await db
      .prepare(
        `
      SELECT p.title, COUNT(r.id) as rental_count 
      FROM products p LEFT JOIN rentals r ON p.id = r.product_id
      GROUP BY p.id ORDER BY rental_count DESC LIMIT 5
    `,
      )
      .all();

    const rentalsByCategory = await db
      .prepare(
        `
      SELECT p.category, COUNT(r.id) as count
      FROM products p JOIN rentals r ON p.id = r.product_id
      GROUP BY p.category
    `,
      )
      .all();

    res.json({ success: true, data: { topProducts, rentalsByCategory } });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

module.exports = router;
