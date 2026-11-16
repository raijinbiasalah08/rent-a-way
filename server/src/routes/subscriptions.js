const express = require("express");
const db = require("../db/database");
const { authenticate, authorize } = require("../middleware/auth");
const { z, validate } = require("../middleware/validation");
const { paidPlans, subscriptionStatus } = require("../utils/subscriptions");

const router = express.Router();
router.use(authenticate, authorize("supplier"));

router.get("/me", async (req, res) => {
  res.json({ success: true, data: await subscriptionStatus(req.user.id) });
});

router.put(
  "/request",
  validate(z.object({ plan: z.enum(paidPlans) })),
  async (req, res) => {
    const status = await db.transaction(async () => {
      await db
        .prepare("UPDATE users SET requested_plan = ? WHERE id = ?")
        .run(req.body.plan, req.user.id);
      return subscriptionStatus(req.user.id);
    });
    res.json({ success: true, data: status });
  },
);

module.exports = router;
