const router = require("express").Router();
const { randomUUID } = require("node:crypto");
const db = require("../db/database");
const { authenticate, authorize } = require("../middleware/auth");
const { z, date, validate } = require("../middleware/validation");
const socket = require("../socket");
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
    new Date(),
  );
const failure = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const select = `SELECT r.*, p.title AS product_title, p.supplier_id, p.category AS product_category,
  (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) AS primary_image,
  c.name AS customer_name, c.phone AS customer_phone, s.name AS supplier_name, s.avatar AS supplier_avatar,
  s.barangay AS supplier_barangay,
  (SELECT id FROM reviews WHERE rental_id = r.id LIMIT 1) AS review_id
  FROM rentals r JOIN products p ON p.id = r.product_id JOIN users c ON c.id = r.customer_id JOIN users s ON s.id = p.supplier_id`;
const decorate = (r) => ({
  ...r,
  is_overdue: r.status === "active" && r.end_date < today(),
});
const allowed = (user, r) =>
  user.role === "admin" ||
  user.id === r.customer_id ||
  user.id === r.supplier_id;
async function lockProduct(id) {
  return db
    .prepare(
      `SELECT * FROM products WHERE id = ?${db.dialect === "postgres" ? " FOR UPDATE" : ""}`,
    )
    .get(id);
}
async function conflict(productId, start, end, excluding = "") {
  return db
    .prepare(
      "SELECT id FROM rentals WHERE product_id = ? AND id <> ? AND status IN ('pending','approved','active','returned') AND start_date < ? AND end_date > ? LIMIT 1",
    )
    .get(productId, excluding, end, start);
}
async function notify(userId, rental, status, link) {
  const data = {
    id: randomUUID(),
    user_id: userId,
    title: "Rental update",
    message: `${rental.product_title || "Rental request"}: ${status}`,
    link,
    created_at: new Date().toISOString(),
    is_read: 0,
  };
  await db
    .prepare(
      "INSERT INTO notifications (id,user_id,title,message,link,created_at) VALUES (?,?,?,?,?,?)",
    )
    .run(data.id, userId, data.title, data.message, link, data.created_at);
  return data;
}
function emit(data, rental) {
  try {
    const io = socket.getIO();
    io.to(`user:${data.user_id}`).emit("new_notification", data);
    io.to(`user:${data.user_id}`).emit("rental_status_changed", rental);
  } catch {
    /* Durable notification remains available over HTTP. */
  }
}
router.post(
  "/",
  authenticate,
  authorize("customer"),
  validate(
    z.object({
      product_id: z.string().uuid(),
      start_date: date,
      end_date: date,
      notes: z.string().trim().max(2000).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const { product_id, start_date, end_date, notes } = req.body;
      const result = await db.transaction(async () => {
        const product = await lockProduct(product_id);
        if (!product?.is_active) throw failure("Equipment not found", 404);
        if (product.supplier_id === req.user.id)
          throw failure("You cannot rent your own equipment");
        if (product.availability !== "available")
          throw failure("Equipment is not currently available", 409);
        const days = (Date.parse(end_date) - Date.parse(start_date)) / 86400000;
        if (
          start_date < today() ||
          days < product.min_days ||
          days > product.max_days
        )
          throw failure(
            `Choose future dates between ${product.min_days} and ${product.max_days} rental days`,
          );
        if (await conflict(product_id, start_date, end_date))
          throw failure(
            "These dates are already reserved. Choose another date range.",
            409,
          );
        const id = randomUUID();
        await db
          .prepare(
            "INSERT INTO rentals (id,product_id,customer_id,start_date,end_date,total_price,status,notes,created_at) VALUES (?,?,?,?,?,?,'pending',?,?)",
          )
          .run(
            id,
            product_id,
            req.user.id,
            start_date,
            end_date,
            Math.round(days * product.price_per_day * 100) / 100,
            notes || null,
            new Date().toISOString(),
          );
        const rental = await db.prepare(select + " WHERE r.id = ?").get(id);
        return {
          rental,
          notification: await notify(
            product.supplier_id,
            rental,
            "pending",
            "/supplier/rentals",
          ),
        };
      });
      emit(result.notification, result.rental);
      res.status(201).json({ success: true, data: decorate(result.rental) });
    } catch (error) {
      next(error);
    }
  },
);
router.get("/", authenticate, async (req, res, next) => {
  try {
    const where =
      req.user.role === "customer"
        ? " WHERE r.customer_id = ?"
        : req.user.role === "supplier"
          ? " WHERE p.supplier_id = ?"
          : " WHERE 1=1";
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 100));
    const offset =
      (Math.min(100000, Math.max(1, parseInt(req.query.page) || 1)) - 1) *
      limit;
    const params = req.user.role === "admin" ? [] : [req.user.id];
    const source = " FROM rentals r JOIN products p ON p.id = r.product_id";
    const counts = await db
      .prepare(
        "SELECT r.status,COUNT(*) AS count" +
          source +
          where +
          " GROUP BY r.status",
      )
      .all(...params);
    const summary = Object.fromEntries(
      counts.map((row) => [row.status, Number(row.count)]),
    );
    summary.total = counts.reduce((sum, row) => sum + Number(row.count), 0);
    const start = new Date(Date.parse(today()) - 6 * 86400000)
      .toISOString()
      .slice(0, 10);
    const activity = await db
      .prepare(
        `SELECT r.start_date AS date,'starts' AS kind,COUNT(*) AS count${source}${where} AND r.status IN ('approved','active','returned','completed') AND r.start_date BETWEEN ? AND ? GROUP BY r.start_date
      UNION ALL SELECT r.end_date AS date,'returns' AS kind,COUNT(*) AS count${source}${where} AND r.status IN ('approved','active','returned','completed') AND r.end_date BETWEEN ? AND ? GROUP BY r.end_date`,
      )
      .all(...params, start, today(), ...params, start, today());
    let filter = "";
    const filterParams = [];
    if (req.query.status && req.query.status !== "all") {
      if (req.query.status === "overdue") {
        filter = " AND r.status = 'active' AND r.end_date < ?";
        filterParams.push(today());
      } else if (
        [
          "pending",
          "approved",
          "active",
          "returned",
          "completed",
          "cancelled",
          "rejected",
        ].includes(req.query.status)
      ) {
        filter = " AND r.status = ?";
        filterParams.push(req.query.status);
      } else
        return res
          .status(400)
          .json({ success: false, message: "Invalid rental status" });
    }
    const rows = await db
      .prepare(
        select +
          where +
          filter +
          " ORDER BY r.created_at DESC,r.id LIMIT ? OFFSET ?",
      )
      .all(...params, ...filterParams, limit + 1, offset);
    res.json({
      success: true,
      data: rows.slice(0, limit).map(decorate),
      hasMore: rows.length > limit,
      summary,
      activity,
    });
  } catch (error) {
    next(error);
  }
});
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const rental = await db
      .prepare(select + " WHERE r.id = ?")
      .get(req.params.id);
    if (!rental) throw failure("Rental not found", 404);
    if (!allowed(req.user, rental)) throw failure("Access denied", 403);
    res.json({ success: true, data: decorate(rental) });
  } catch (error) {
    next(error);
  }
});
router.put(
  "/:id/status",
  authenticate,
  validate(
    z.object({
      status: z.enum([
        "approved",
        "rejected",
        "cancelled",
        "active",
        "returned",
        "completed",
      ]),
      notes: z.string().trim().max(2000).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await db.transaction(async () => {
        let rental = await db
          .prepare(select + " WHERE r.id = ?")
          .get(req.params.id);
        if (!rental) throw failure("Rental not found", 404);
        if (!allowed(req.user, rental)) throw failure("Access denied", 403);
        await lockProduct(rental.product_id);
        rental = await db
          .prepare(select + " WHERE r.id = ?")
          .get(req.params.id);
        const customer = req.user.role === "customer";
        const transitions = customer
          ? {
              pending: ["cancelled"],
              approved: ["cancelled"],
              active: ["returned"],
            }
          : {
              pending: ["approved", "rejected"],
              approved: ["active", "cancelled"],
              active: ["returned"],
              returned: ["completed"],
            };
        const { status, notes } = req.body;
        if (customer && !["cancelled", "returned"].includes(status))
          throw failure("Customers cannot approve or activate rentals", 403);
        if (!transitions[rental.status]?.includes(status))
          throw failure("This status change is not allowed", 409);
        if (
          status === "active" &&
          (rental.start_date > today() || rental.end_date < today())
        )
          throw failure("Handover must occur within the reserved dates");
        if (
          status === "approved" &&
          (rental.start_date < today() ||
            (await conflict(
              rental.product_id,
              rental.start_date,
              rental.end_date,
              rental.id,
            )))
        )
          throw failure("The reservation dates are no longer available", 409);
        await db
          .prepare("UPDATE rentals SET status = ?, notes = ? WHERE id = ?")
          .run(
            status,
            notes
              ? [rental.notes, notes].filter(Boolean).join(" | ")
              : rental.notes,
            rental.id,
          );
        const updated = { ...rental, status };
        const notification = await notify(
          customer ? rental.supplier_id : rental.customer_id,
          updated,
          status,
          customer ? "/supplier/rentals" : "/customer/rentals",
        );
        return { rental: updated, notification };
      });
      emit(result.notification, result.rental);
      res.json({ success: true, data: decorate(result.rental) });
    } catch (error) {
      next(error);
    }
  },
);
module.exports = router;
