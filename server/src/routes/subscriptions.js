const express = require("express");
const db = require("../db/database");
const { authenticate, authorize } = require("../middleware/auth");
const { z, validate } = require("../middleware/validation");
const { randomUUID } = require("node:crypto");
const {
  paidPlans,
  packages,
  subscriptionStatus,
} = require("../utils/subscriptions");

const router = express.Router();
router.use(authenticate, authorize("supplier"));

router.get("/me", async (req, res) => {
  res.json({ success: true, data: await subscriptionStatus(req.user.id) });
});

router.put(
  "/request",
  validate(
    z.object({
      plan: z.enum(paidPlans),
      reference: z
        .string()
        .max(50)
        .transform((value) => value.trim().replace(/[ -]/g, ""))
        .pipe(
          z
            .string()
            .regex(
              /^\d{10,20}$/,
              "Enter the 10–20 digits from your GCash receipt.",
            ),
        )
        .optional(),
    }),
  ),
  async (req, res) => {
    const status = await db.transaction(async () => {
      const { plan } = req.body;
      const reference = req.body.reference || null;
      const current = await db
        .prepare(
          "UPDATE users SET requested_plan = ? WHERE id = ? AND requested_plan IS NULL RETURNING id",
        )
        .get(plan, req.user.id);
      if (!current) {
        const same = await db
          .prepare(
            "SELECT id FROM subscription_payments WHERE supplier_id = ? AND status = 'pending' AND plan = ? AND reference = ?",
          )
          .get(req.user.id, plan, reference);
        if (same) return subscriptionStatus(req.user.id);
        throw Object.assign(
          new Error("You already have a subscription request awaiting review."),
          { status: 409 },
        );
      }
      if (
        !(await db
          .prepare("SELECT id FROM subscription_receiver WHERE id = 1")
          .get())
      )
        throw Object.assign(
          new Error("Subscription payments are not set up yet."),
          { status: 409 },
        );
      const amount = packages.find((pkg) => pkg.id === plan).monthlyPrice;
      const payment = await db
        .prepare(
          `INSERT INTO subscription_payments
        (id,supplier_id,plan,amount,reference,status,created_at) VALUES (?,?,?,?,?,'pending',?)
        ON CONFLICT DO NOTHING RETURNING id`,
        )
        .get(
          randomUUID(),
          req.user.id,
          plan,
          amount,
          reference,
          new Date().toISOString(),
        );
      if (!payment)
        throw Object.assign(
          new Error("This payment reference has already been submitted."),
          { status: 409 },
        );
      return subscriptionStatus(req.user.id);
    });
    res.json({ success: true, data: status });
  },
);

module.exports = router;
