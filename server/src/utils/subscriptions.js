const db = require("../db/database");

const packages = [
  {
    id: "free",
    name: "Free Account",
    monthlyPrice: 0,
    benefits: [
      "One active rental upload",
      "Browse rental listings",
      "Basic account access",
    ],
  },
  {
    id: "student",
    name: "Premium Student",
    monthlyPrice: 80,
    benefits: [
      "Unlimited rental uploads",
      "Premium listing visibility",
      "Personal premium account badge",
      "Access to featured listing opportunities",
    ],
  },
  {
    id: "business",
    name: "Premium Business",
    monthlyPrice: 100,
    benefits: [
      "Unlimited rental uploads",
      "Premium listing visibility",
      "Verified business profile and badge",
      "Access to business advertising opportunities",
    ],
  },
];

const paidPlans = ["student", "business"];
const badgeSQL = `CASE WHEN u.subscription_expires_at > ? THEN
  CASE u.subscription_plan WHEN 'student' THEN 'Premium Student'
    WHEN 'business' THEN 'Verified Business' END END AS supplier_badge`;

async function subscriptionStatus(id) {
  const user = await db
    .prepare(
      `SELECT subscription_plan, subscription_expires_at, requested_plan,
    (SELECT COUNT(*) FROM products WHERE supplier_id = users.id AND is_active = 1) AS active_count
    FROM users WHERE id = ?`,
    )
    .get(id);
  const currentPlan =
    user.subscription_expires_at > new Date().toISOString()
      ? user.subscription_plan
      : "free";
  const receiver = await db
    .prepare(
      "SELECT account_name, qr_url FROM subscription_receiver WHERE id = 1",
    )
    .get();
  return {
    receiver: receiver || null,
    currentPlan,
    expiresAt: currentPlan === "free" ? null : user.subscription_expires_at,
    requestedPlan: user.requested_plan,
    activeCount: Number(user.active_count),
    canPublish: currentPlan !== "free" || Number(user.active_count) < 1,
    packages,
  };
}

// Call inside the publication transaction. A fresh count after acquiring the
// supplier lock sees earlier publications on PostgreSQL. SQLite uses BEGIN IMMEDIATE.
async function checkListingSlot(supplierId) {
  if (db.dialect === "postgres")
    await db
      .prepare("SELECT id FROM users WHERE id = ? FOR UPDATE")
      .get(supplierId);
  const status = await subscriptionStatus(supplierId);
  if (!status.canPublish)
    throw Object.assign(
      new Error("The Free Account includes one active listing."),
      {
        status: 409,
        code: "LISTING_LIMIT_REACHED",
        subscription: status,
      },
    );
}

function nextMonth(start) {
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCMonth(end.getUTCMonth() + 2, 0);
  end.setUTCDate(Math.min(day, end.getUTCDate()));
  return end.toISOString();
}

module.exports = {
  packages,
  paidPlans,
  badgeSQL,
  subscriptionStatus,
  checkListingSlot,
  nextMonth,
};
