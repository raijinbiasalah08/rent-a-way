const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rentaway-test-"));
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-secret-not-for-deployment-123456789";
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.MAIL_OUTBOX = path.join(dir, "mail");
process.env.UPLOADS_DIR = path.join(dir, "uploads");
delete process.env.DATABASE_URL;
delete process.env.RESEND_API_KEY;
if (process.env.TEST_POSTGRES === "1") require("./postgres-harness.cjs");
const db = require("../src/db/database");
const { start } = require("../src/index");
const jwt = require("jsonwebtoken");
let server, base;
const ids = {
  admin: randomUUID(),
  supplier: randomUUID(),
  customer: randomUUID(),
  stranger: randomUUID(),
};
const tokens = {};
let product, rental;
async function api(url, method = "GET", body, role = "customer") {
  if ((url === "/auth/register" || url === "/auth/google") && body?.acceptedTermsVersion === "2026-11-19") {
    const form = new FormData();
    Object.entries(body).forEach(([key, value]) => form.append(key, value));
    form.append("identityDocument", new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }), "id.png");
    body = form;
  }
  const result = await fetch(base + "/api" + url, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(role ? { Authorization: "Bearer " + tokens[role] } : {}),
    },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: result.status, ...(await result.json()) };
}
before(async () => {
  server = await start(0);
  base = "http://127.0.0.1:" + server.address().port;
  for (const [key, id] of Object.entries(ids)) {
    const role = key === "stranger" ? "customer" : key;
    await db
      .prepare(
        "INSERT INTO users (id,name,email,password_hash,role,barangay,latitude,longitude,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        key,
        `${key}@example.test`,
        await require("bcryptjs").hash("valid-password-123", 4),
        role,
        "San Aquilino",
        12.5967,
        121.4841,
        new Date().toISOString(),
      );
    tokens[key] = jwt.sign({ id, role, version: 0 }, process.env.JWT_SECRET);
  }
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await db.close();
});
test("registration rejects privilege escalation and weak passwords; normal registration works", async () => {
  for (const acceptedTermsVersion of [undefined, false, "outdated"]) {
    const response = await api("/auth/register", "POST", {
      name: "Test Customer", email: "new@example.test",
      password: "valid-password-123", acceptedTermsVersion,
    }, null);
    assert.equal(response.status, 400);
  }
  assert.equal(
    (
      await api(
        "/auth/register",
        "POST",
        { acceptedTermsVersion: "2026-11-19", name: "Test Customer", email: "new@example.test", password: "short" },
        null,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await api(
        "/auth/register",
        "POST",
        {
          acceptedTermsVersion: "2026-11-19",
          name: "Test Customer",
          email: "new@example.test",
          password: "valid-password-123",
          role: "admin",
        },
        null,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await api(
        "/auth/register",
        "POST",
        {
          acceptedTermsVersion: "2026-11-19",
          name: "Test Customer",
          email: "new@example.test",
          password: "valid-password-123",
        },
        null,
      )
    ).status,
    201,
  );
  const consent = await db.prepare(
    "SELECT terms_version, terms_accepted_at, created_at FROM users WHERE email = ?",
  ).get("new@example.test");
  assert.equal(consent.terms_version, "2026-11-19");
  assert.equal(consent.terms_accepted_at, consent.created_at);
});
test("supplier creates listing and public search handles punctuation", async () => {
  const result = await api(
    "/products",
    "POST",
    {
      title: "Camera kit",
      category: "Cameras",
      price_per_day: 100,
      min_days: 1,
      max_days: 30,
      description: "A camera",
      barangay: "San Aquilino",
      location: "Roxas",
      latitude: 12.5967,
      longitude: 121.4841,
    },
    "supplier",
  );
  assert.equal(result.status, 201, JSON.stringify(result));
  product = result.data.id;
  assert.equal(
    (await api("/products?search=%22%2A%3F", "GET", undefined, null)).status,
    200,
  );
  assert.equal(
    (await api("/products/categories", "GET", undefined, null)).status,
    200,
  );
  assert.equal(
    (await api("/products/locations/barangays", "GET", undefined, null)).status,
    200,
  );
});
test("invalid dates are rejected; overlapping requests are serialized; pricing is server-owned", async () => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
  }).format(new Date());
  const end = new Date(Date.parse(today) + 2 * 86400000)
    .toISOString()
    .slice(0, 10);
  assert.equal(
    (
      await api("/rentals", "POST", {
        product_id: product,
        start_date: "bad",
        end_date: end,
      })
    ).status,
    400,
  );
  const results = await Promise.all(
    [1, 2].map(() =>
      api("/rentals", "POST", {
        product_id: product,
        start_date: today,
        end_date: end,
        total_price: 1,
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  rental = results.find((r) => r.status === 201).data.id;
  assert.equal(results.find((r) => r.status === 201).data.total_price, 200);
});
test("ownership and payment-free lifecycle", async () => {
  assert.equal(
    (await api(`/rentals/${rental}`, "GET", undefined, "stranger")).status,
    403,
  );
  assert.equal(
    (await api(`/rentals/${rental}/status`, "PUT", { status: "approved" }))
      .status,
    403,
  );
  for (const [status, role] of [
    ["approved", "supplier"],
    ["active", "supplier"],
    ["returned", "customer"],
    ["completed", "supplier"],
  ]) {
    const result = await api(
      `/rentals/${rental}/status`,
      "PUT",
      { status },
      role,
    );
    assert.equal(result.status, 200, JSON.stringify(result));
  }
  assert.equal((await api("/payments", "GET")).status, 404);
});
test("only completed rentals can receive one review", async () => {
  const data = {
    product_id: product,
    rental_id: rental,
    rating: 5,
    comment: "Excellent",
  };
  assert.equal((await api("/reviews", "POST", data, "stranger")).status, 403);
  assert.equal((await api("/reviews", "POST", data)).status, 201);
  assert.equal((await api("/reviews", "POST", data)).status, 409);
  assert.equal(
    (await api(`/reviews/product/${product}`, "GET", undefined, null)).data
      .length,
    1,
  );
});
test("community likes toggle, favorites reject nonexistent products, reports agree", async () => {
  const post = await api("/community", "POST", {
    content: "Hello Roxas",
    type: "tip",
  });
  assert.equal(
    (await api(`/community/${post.data.id}/like`, "PUT", {})).data.likes,
    1,
  );
  assert.equal(
    (await api(`/community/${post.data.id}/like`, "PUT", {})).data.likes,
    0,
  );
  assert.equal(
    (await api("/favorites/" + randomUUID(), "POST", {})).status,
    404,
  );
  const stats = await api("/admin/stats", "GET", undefined, "admin");
  assert.equal(stats.status, 200);
  assert.equal(stats.data.completedRentals, 1);
  assert.equal(
    (await api("/admin/reports", "GET", undefined, "admin")).status,
    200,
  );
});
test("messages, location, blocking, and delivery receipts enforce participants", async () => {
  const text = await api("/messages", "POST", {
    receiver_id: ids.supplier,
    content: "Can we arrange pickup?",
  });
  assert.equal(text.status, 201, JSON.stringify(text));
  assert.equal(
    (
      await api("/messages/location", "POST", {
        receiver_id: ids.supplier,
        location_lat: 12.5967,
        location_lng: 121.4841,
        location_label: "Pickup",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await api("/messages/equipment", "POST", {
        receiver_id: ids.supplier,
        equipment_id: product,
      })
    ).status,
    201,
  );
  assert.equal(
    (await api("/messages/conversations", "GET", undefined, "supplier")).status,
    200,
  );
  assert.equal(
    (await api(`/messages/${ids.customer}`, "GET", undefined, "supplier")).data
      .length,
    3,
  );
  assert.equal(
    (await api(`/messages/deliver/${text.data.id}`, "PUT", {}, "stranger"))
      .status,
    404,
  );
  assert.equal(
    (
      await api(
        "/messages/block",
        "POST",
        { blocked_id: ids.customer },
        "supplier",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await api("/messages/location", "POST", {
        receiver_id: ids.supplier,
        location_lat: 12.5,
        location_lng: 121.4,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await api("/messages", "POST", {
        receiver_id: ids.supplier,
        content: "blocked",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await api(
        `/messages/block/${ids.customer}`,
        "DELETE",
        undefined,
        "supplier",
      )
    ).status,
    200,
  );
});
test("uploads validate actual content and enforce ownership", async () => {
  async function upload(file, role = "supplier") {
    const body = new FormData();
    body.set("image", file, "test.png");
    return fetch(base + `/api/products/${product}/images`, {
      method: "POST",
      headers: { Authorization: "Bearer " + tokens[role] },
      body,
    });
  }
  assert.equal(
    (await upload(new Blob(["not an image"], { type: "image/png" }))).status,
    400,
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
    "base64",
  );
  assert.equal(
    (await upload(new Blob([png], { type: "image/png" }), "customer")).status,
    403,
  );
  const result = await upload(new Blob([png], { type: "image/png" }));
  assert.equal(result.status, 200);
});
test("socket connection rejects unverified identity and accepts JWT", async () => {
  const { io } = require("../../client/node_modules/socket.io-client");
  const invalid = io(base, {
    auth: { userId: ids.admin },
    reconnection: false,
  });
  const error = await new Promise((resolve) =>
    invalid.once("connect_error", resolve),
  );
  assert.match(error.message, /Authentication/);
  invalid.disconnect();
  const valid = io(base, {
    auth: { token: tokens.customer },
    reconnection: false,
  });
  await new Promise((resolve, reject) => {
    valid.once("connect", resolve);
    valid.once("connect_error", reject);
  });
  valid.disconnect();
});
test("admin safeguards, listing validation, image order, and pagination", async () => {
  const primaryImage = await db
    .prepare(
      "SELECT url FROM product_images WHERE product_id = ? AND is_primary = 1 LIMIT 1",
    )
    .get(product);
  assert.ok(primaryImage?.url);
  const adminProducts = await api(
    "/admin/products?search=Camera",
    "GET",
    undefined,
    "admin",
  );
  assert.equal(adminProducts.status, 200);
  assert.equal(
    adminProducts.data.find((item) => item.id === product)?.primary_image,
    primaryImage.url,
  );
  assert.equal(
    (await api(`/admin/users/${ids.admin}`, "DELETE", undefined, "admin"))
      .status,
    400,
  );
  assert.equal(
    (
      await api(
        "/admin/products/" + randomUUID() + "/toggle",
        "PUT",
        {},
        "admin",
      )
    ).status,
    404,
  );
  const users = await api(
    "/admin/users?limit=1&page=2",
    "GET",
    undefined,
    "admin",
  );
  assert.equal(users.data.length, 1);
  assert.equal(users.pagination.page, 2);
  const listing = (await api("/products/" + product)).data;
  assert.equal(
    (
      await api(
        "/products/" + product,
        "PUT",
        { ...listing, barangay: "Invalid" },
        "supplier",
      )
    ).status,
    400,
  );
  const image = listing.images[0];
  assert.equal(
    (
      await api(
        `/products/${product}/images/order`,
        "PUT",
        { image_ids: [image.id] },
        "supplier",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await api(
        `/products/${product}/images/order`,
        "PUT",
        { image_ids: [randomUUID()] },
        "supplier",
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await api(
        `/products/${product}/images/${image.id}`,
        "DELETE",
        undefined,
        "supplier",
      )
    ).status,
    200,
  );
  assert.equal(
    await db
      .prepare("SELECT url FROM uploaded_assets WHERE url = ?")
      .get(image.url),
    undefined,
  );
  const messages = await api(`/messages/${ids.supplier}?limit=1`);
  assert.equal(messages.data.length, 1);
  assert.equal(messages.hasMore, true);
  const older = await api(
    `/messages/${ids.supplier}?limit=1&before=${messages.data[0].id}`,
  );
  assert.equal(older.data.length, 1);
  assert.notEqual(older.data[0].id, messages.data[0].id);
});
test("expired reset tokens fail without changing the password", async () => {
  const { createHash } = require("node:crypto");
  const token = "e".repeat(64);
  await db
    .prepare(
      "INSERT INTO password_resets (user_id,token_hash,expires_at) VALUES (?,?,?)",
    )
    .run(
      ids.customer,
      createHash("sha256").update(token).digest("hex"),
      new Date(Date.now() - 60000).toISOString(),
    );
  assert.equal(
    (
      await api(
        "/auth/reset-password",
        "POST",
        { token, password: "replacement-password-123" },
        null,
      )
    ).status,
    400,
  );
});
test("password reset is generic, single-use, and invalidates sessions", async () => {
  const missing = await api(
    "/auth/forgot-password",
    "POST",
    { email: "missing@example.test" },
    null,
  );
  const known = await api(
    "/auth/forgot-password",
    "POST",
    { email: "customer@example.test" },
    null,
  );
  assert.equal(missing.message, known.message);
  assert.equal(known.resetToken, undefined);
  const mail = JSON.parse(
    fs.readFileSync(
      path.join(
        process.env.MAIL_OUTBOX,
        fs.readdirSync(process.env.MAIL_OUTBOX)[0],
      ),
    ),
  );
  const token = mail.url.split("/").pop();
  assert.equal(
    (
      await api(
        "/auth/reset-password",
        "POST",
        { token, password: "replacement-password-123" },
        null,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await api(
        "/auth/reset-password",
        "POST",
        { token, password: "replacement-password-456" },
        null,
      )
    ).status,
    400,
  );
  assert.equal((await api("/auth/me")).status, 401);
});
test("migration archives financial data and is repeatable without losing users or rentals", async () => {
  const before = (await db.prepare("SELECT COUNT(*) AS c FROM users").get()).c;
  await db.exec(
    "CREATE TABLE payments (id TEXT PRIMARY KEY, amount REAL); ALTER TABLE rentals ADD COLUMN security_deposit REAL DEFAULT 0;",
  );
  await db
    .prepare("INSERT INTO payments (id,amount) VALUES (?,?)")
    .run("legacy-record", 100);
  await db.initialize();
  await db.initialize();
  assert.equal(
    (
      await db
        .prepare("SELECT amount FROM legacy_payments_archive WHERE id=?")
        .get("legacy-record")
    ).amount,
    100,
  );
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS c FROM users").get()).c,
    before,
  );
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS c FROM rentals").get()).c,
    1,
  );
  if (!process.env.TEST_POSTGRES) {
    const persisted = new (require("node:sqlite").DatabaseSync)(
      process.env.DATABASE_PATH,
      { readOnly: true },
    );
    assert.equal(
      persisted.prepare("SELECT COUNT(*) AS c FROM rentals").get().c,
      1,
    );
    persisted.close();
  }
});

test("rental summaries remain accurate beyond a page and CORS preflights are not rate limited", async () => {
  const result = await api(
    "/rentals?limit=1&page=2",
    "GET",
    undefined,
    "supplier",
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.length, 0);
  assert.equal(result.summary.total, 1);
  assert.equal(result.summary.completed, 1);
  assert.ok(
    result.activity.some(
      (row) => row.kind === "starts" && Number(row.count) === 1,
    ),
  );
  assert.equal(
    (await api("/rentals?status=active", "GET", undefined, "supplier")).data
      .length,
    0,
  );
  assert.equal(
    (await api("/rentals?status=completed", "GET", undefined, "supplier")).data
      .length,
    1,
  );
  const preflight = await fetch(base + "/api/auth/me", {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5173",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "http://localhost:5173",
  );
  assert.equal(preflight.headers.get("ratelimit"), null);
});

test("free listing slots, premium requests, publication and expiry", async () => {
  const supplierId = randomUUID();
  await db
    .prepare(
      `INSERT INTO users (id,name,email,password_hash,role,barangay,created_at)
    VALUES (?, 'Listing owner', 'owner@example.test', 'unused', 'supplier', 'San Aquilino', ?)`,
    )
    .run(supplierId, new Date().toISOString());
  tokens.owner = jwt.sign(
    { id: supplierId, role: "supplier", version: 0 },
    process.env.JWT_SECRET,
  );
  const owner = (url, method, body) => api(url, method, body, "owner");
  const status = async () => (await owner("/subscriptions/me")).data;
  const body = {
    title: "Listing quota test",
    category: "Camping",
    price_per_day: 50,
  };
  const publish = () => owner("/products", "POST", body);
  const review = (plan, decision = "approve", role = "admin") =>
    api(
      `/admin/users/${supplierId}/subscription`,
      "PUT",
      { plan, decision },
      role,
    );
  const request = (plan) => owner("/subscriptions/request", "PUT", { plan });
  const initial = await status();
  assert.equal(initial.currentPlan, "free");
  assert.equal(initial.canPublish, true);
  assert.deepEqual(
    initial.packages.map((pkg) => pkg.monthlyPrice),
    [0, 80, 100],
  );
  const posts = await Promise.all([publish(), publish()]);
  assert.deepEqual(posts.map((p) => p.status).sort(), [201, 409]);
  const firstId = posts.find((p) => p.status === 201).data.id;
  assert.equal(
    posts.find((p) => p.status === 409).code,
    "LISTING_LIMIT_REACHED",
  );
  assert.equal(
    (
      await owner("/products/" + firstId, "PUT", {
        ...body,
        availability: "rented",
      })
    ).status,
    200,
  );
  assert.equal((await status()).canPublish, false);
  assert.equal((await owner("/products/" + firstId, "DELETE")).status, 200);
  assert.equal((await publish()).status, 201);
  assert.equal(
    (await api("/admin/products/" + firstId + "/toggle", "PUT", {}, "admin"))
      .code,
    "LISTING_LIMIT_REACHED",
  );
  assert.equal(
    (
      await api(
        "/subscriptions/request",
        "PUT",
        { plan: "student" },
        "stranger",
      )
    ).status,
    403,
  );
  assert.equal((await request("unknown")).status, 400);
  assert.equal((await request("student")).data.requestedPlan, "student");
  assert.equal((await publish()).status, 409);
  assert.equal((await review("student", "approve", "owner")).status, 403);
  assert.equal((await review("business")).status, 409);
  assert.equal((await review("student", "decline")).status, 200);
  assert.equal((await status()).requestedPlan, null);
  for (const [plan, badge] of [
    ["student", "Premium Student"],
    ["business", "Verified Business"],
  ]) {
    await request(plan);
    assert.equal((await review(plan)).status, 200);
    assert.equal((await review(plan)).status, 409);
    const active = await status();
    assert.equal(active.currentPlan, plan);
    assert.ok(new Date(active.expiresAt) > new Date());
    assert.equal(active.canPublish, true);
    const listing = await publish();
    assert.equal(listing.status, 201);
    assert.equal((await owner("/auth/me")).data.supplier_badge, badge);
    assert.equal(
      (await owner("/products/" + listing.data.id)).data.supplier_badge,
      badge,
    );
  }
  const otherId = randomUUID();
  await db
    .prepare(
      "INSERT INTO products (id,supplier_id,title,category,price_per_day,created_at) VALUES (?,?,?,?,?,?)",
    )
    .run(
      otherId,
      ids.supplier,
      body.title,
      body.category,
      body.price_per_day,
      "2099-01-01T00:00:00.000Z",
    );
  const catalog = () =>
    owner("/products?search=Listing%20quota%20test&limit=1");
  assert.equal((await catalog()).data.products[0].supplier_id, supplierId);
  await db
    .prepare("UPDATE users SET subscription_expires_at = ? WHERE id = ?")
    .run("2000-01-01T00:00:00.000Z", supplierId);
  assert.equal((await catalog()).data.products[0].id, otherId);
  const expiredCatalog = await owner("/products?search=Listing%20quota%20test");
  assert.equal(
    expiredCatalog.data.products.filter((row) => row.supplier_id === supplierId)
      .length,
    3,
  );
  assert.equal((await owner("/auth/me")).data.supplier_badge, null);
  assert.equal((await status()).currentPlan, "free");
  assert.equal((await publish()).status, 409);
});
test("Google signup records consent at role selection and returning users can sign in", async (t) => {
  process.env.GOOGLE_CLIENT_ID = "registration-test";
  const { privateKey, publicKey } = require("node:crypto").generateKeyPairSync("rsa", { modulusLength: 2048 });
  const key = { ...publicKey.export({ format: "jwk" }), kid: "registration" };
  const realFetch = global.fetch;
  t.mock.method(global, "fetch", (url, options) => {
    if (url === "https://www.googleapis.com/oauth2/v3/certs") return Response.json({ keys: [key] });
    return realFetch(url, options);
  });
  for (const role of ["customer", "supplier"]) {
    const email = `google-${role}@example.test`;
    const credential = jwt.sign({ sub: role, email, email_verified: true }, privateKey, {
      algorithm: "RS256", keyid: key.kid, audience: process.env.GOOGLE_CLIENT_ID,
      issuer: "https://accounts.google.com", expiresIn: "5m",
    });
    const submit = (extra) => api("/auth/google", "POST", { credential, ...extra }, null);
    assert.equal((await submit({})).data.needsRoleSelection, true);
    assert.equal((await submit({ role })).status, 400);
    assert.equal((await submit({ role, acceptedTermsVersion: "outdated" })).status, 400);
    const created = await submit({ role, acceptedTermsVersion: "2026-11-19" });
    assert.equal(created.data.user.role, role);
    const row = await db.prepare("SELECT terms_version, terms_accepted_at, created_at FROM users WHERE email = ?").get(email);
    assert.equal(row.terms_version, "2026-11-19");
    assert.equal(row.terms_accepted_at, row.created_at);
    assert.equal((await submit({})).data.user.id, created.data.user.id);
  }
});

test("registration requires a private ID and only admins can view it", async () => {
  const result = await fetch(base + "/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "No ID", email: "missing-id@example.test", password: "valid-password-123", acceptedTermsVersion: "2026-11-19" }),
  });
  assert.equal(result.status, 400);
  const user = await db.prepare("SELECT id FROM users WHERE email = ?").get("new@example.test");
  assert.equal((await api("/admin/users/" + user.id + "/identity")).status, 403);
  const response = await fetch(base + "/api/admin/users/" + user.id + "/identity", { headers: { Authorization: "Bearer " + tokens.admin } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("content-type"), "image/png");
});
