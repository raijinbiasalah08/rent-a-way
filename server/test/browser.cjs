const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "rentaway-browser-"));
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = path.join(temp, "test.db");
process.env.UPLOADS_DIR = path.join(temp, "uploads");
process.env.MAIL_OUTBOX = path.join(temp, "mail");
process.env.JWT_SECRET = "isolated-browser-test-secret-123456789";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5179";
delete process.env.DATABASE_URL;
delete process.env.RESEND_API_KEY;
async function main() {
  const db = require("../src/db/database");
  const { start } = require("../src/index");
  const server = await start(0);
  const api = "http://127.0.0.1:" + server.address().port;
  process.chdir(path.join(root, "client"));
  const { createServer } = await import(
    pathToFileURL(
      path.join(root, "client/node_modules/vite/dist/node/index.js"),
    ).href
  );
  const vite = await createServer({
    root: path.join(root, "client"),
    server: { host: "127.0.0.1", port: 5179, strictPort: true },
    define: { "import.meta.env.VITE_API_URL": JSON.stringify(api) },
  });
  await vite.listen();
  const {
    chromium,
    expect,
  } = require("../../client/node_modules/@playwright/test");
  let browser;
  try {
    browser = await chromium.launch({
      channel: process.env.BROWSER_CHANNEL || "chrome",
      headless: true,
    });
    const credentials = {};
    for (const role of ["supplier", "customer", "admin"]) {
      const id = randomUUID();
      credentials[role] = {
        id,
        token: require("jsonwebtoken").sign(
          { id, role, version: 0 },
          process.env.JWT_SECRET,
        ),
      };
      await db
        .prepare(
          "INSERT INTO users (id,name,email,password_hash,role,created_at,barangay) VALUES (?,?,?,?,?,?,'San Aquilino')",
        )
        .run(
          id,
          `Test ${role}`,
          `${role}@test.example`,
          await require("bcryptjs").hash("browser-password-123", 4),
          role,
          new Date().toISOString(),
        );
    }
    const product = randomUUID();
    await db
      .prepare(
        "INSERT INTO products (id,supplier_id,title,category,price_per_day,created_at) VALUES (?,?,?,?,?,?)",
      )
      .run(
        product,
        credentials.supplier.id,
        "Browser Camera",
        "Cameras",
        100,
        new Date().toISOString(),
      );
    for (const role of ["customer", "supplier", "admin"]) {
      const context = await browser.newContext();
      await context.addInitScript(
        (token) => localStorage.setItem("token", token),
        credentials[role].token,
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (message) => {
        if (message.type() === "error")
          console.error("Browser console:", message.text());
      });
      page.on("requestfailed", (request) => {
        console.error(
          "Browser request failed:",
          request.url(),
          request.failure()?.errorText,
        );
      });
      const routes =
        role === "customer"
          ? [
              "/customer/dashboard",
              "/customer/rentals",
              "/customer/profile",
              "/community",
              "/messages",
              "/browse",
              `/product/${product}`,
              `/customer/booking/${product}`,
            ]
          : role === "supplier"
            ? [
                "/supplier/dashboard",
                "/supplier/rentals",
                "/supplier/products",
                "/supplier/profile",
                "/supplier/products/new",
                `/supplier/products/${product}/edit`,
              ]
            : [
                "/admin/dashboard",
                "/admin/users",
                "/admin/products",
                "/admin/rentals",
                "/admin/reports",
                "/admin/complaints",
              ];
      for (const route of routes) {
        if (route === "/supplier/products/new") {
          await page.goto("http://127.0.0.1:5179/supplier/products");
          await page
            .getByRole("link", { name: "Add listing", exact: true })
            .click();
        } else {
          await page.goto("http://127.0.0.1:5179" + route, {
            waitUntil: "domcontentloaded",
          });
        }
        await expect(page.locator("main").first()).toBeVisible();
        if (route === "/browse") {
          const categories = page
            .getByRole("button", { name: "Cameras", exact: true })
            .first();
          for (const reducedMotion of ["no-preference", "reduce"]) {
            await page.emulateMedia({ reducedMotion });
            await categories.hover();
            await page.mouse.down();
            if (reducedMotion === "reduce") {
              await expect(categories).toHaveCSS("scale", "none");
            } else {
              await expect(categories).toHaveCSS("scale", "0.98");
            }
            await page.mouse.up();
            await expect(categories).toHaveAttribute("aria-pressed", "true");
          }
          await page.emulateMedia({ reducedMotion: "no-preference" });
        }
        if (route === "/supplier/products/new") {
          const plans = page.getByRole("dialog", {
            name: "Subscription Packages",
          });
          await expect(
            plans.getByText("Free Account", { exact: true }),
          ).toBeVisible();
          await expect(
            plans.getByText("₱80/month", { exact: true }),
          ).toBeVisible();
          await expect(
            plans.getByText("₱100/month", { exact: true }),
          ).toBeVisible();
          await plans
            .getByRole("button", { name: "Request Premium Student" })
            .click();
          await plans
            .getByRole("button", {
              name: "Request plan for manual confirmation",
            })
            .click();
          await expect(
            plans.getByRole("button", { name: "Request pending" }),
          ).toBeDisabled();
          await plans.getByRole("button", { name: "Close dialog" }).click();
          await expect(page).toHaveURL(/supplier\/products$/);
        }
        if (route === "/admin/users") {
          await page
            .getByRole("button", { name: "Review subscription" })
            .click();
          const review = page.getByRole("dialog", {
            name: "Review subscription",
          });
          await expect(review).toContainText("₱80/month");
          await review
            .getByRole("button", { name: "Activate for one month" })
            .click();
          await expect(review).toHaveCount(0);
        }
        assert.equal(
          await page.getByRole("heading", { name: "Page not found" }).count(),
          0,
          route,
        );
        assert.equal(
          await page
            .getByText(/PayMongo|GCash|Payment Proof|Platform Revenue/)
            .count(),
          0,
          route,
        );
      }
      assert.deepEqual(errors, [], `${role} browser errors`);
      await context.close();
      console.log(
        `${role}: ${routes.length} routes loaded without runtime errors`,
      );
    }
    // The smoke sweep visits all three roles from one IP. Respect the real API
    // rate window before the next batch instead of disabling production limits.
    console.log("Waiting for API rate window before workflow checks");
    await new Promise((resolve) => setTimeout(resolve, 60000));
    // Exercise the complete booking lifecycle using the visible controls.
    const customerContext = await browser.newContext();
    await customerContext.addInitScript(
      (token) => localStorage.setItem("token", token),
      credentials.customer.token,
    );
    const customerPage = await customerContext.newPage();
    customerPage.on("pageerror", (error) =>
      console.error("Journey page error:", error.message),
    );
    customerPage.on("requestfailed", (request) => {
      if (request.url().startsWith(api))
        console.error(
          "Journey request failed:",
          new URL(request.url()).pathname,
          request.failure()?.errorText,
        );
    });
    customerPage.on("response", (response) => {
      if (response.url().startsWith(api) && response.status() >= 400)
        console.error(
          "Journey API response:",
          response.status(),
          new URL(response.url()).pathname,
        );
    });
    await customerPage.goto(
      `http://127.0.0.1:5179/messages?userId=${credentials.supplier.id}`,
    );
    await expect(
      customerPage.getByPlaceholder("Type a message…"),
    ).toBeVisible();
    await customerPage
      .getByPlaceholder("Type a message…")
      .fill("Browser pickup inquiry");
    await customerPage.getByPlaceholder("Type a message…").press("Enter");
    await expect(
      customerPage.getByText("Browser pickup inquiry", { exact: true }).last(),
    ).toBeVisible();
    console.log("New conversation deep link and text message passed");
    await customerPage.goto(
      `http://127.0.0.1:5179/customer/booking/${product}`,
    );
    await customerPage.waitForLoadState("networkidle");
    assert.equal(
      new URL(customerPage.url()).pathname,
      `/customer/booking/${product}`,
      "Booking must remain on its requested route",
    );
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(new Date());
    await customerPage.locator("input[type=date]").nth(0).fill(today);
    await customerPage
      .locator("input[type=date]")
      .nth(1)
      .fill(new Date(Date.parse(today) + 86400000).toISOString().slice(0, 10));
    await customerPage
      .getByRole("button", { name: "Send rental request", exact: true })
      .click();
    await expect(customerPage).toHaveURL(/customer\/rentals/);
    await expect(
      customerPage.getByRole("button", { name: "Cancel request", exact: true }),
    ).toBeVisible();
    const supplierContext = await browser.newContext();
    await supplierContext.addInitScript(
      (token) => localStorage.setItem("token", token),
      credentials.supplier.token,
    );
    const supplierPage = await supplierContext.newPage();
    await supplierPage.goto("http://127.0.0.1:5179/supplier/products/new");
    await supplierPage
      .getByLabel("Listing Title", { exact: false })
      .fill("Premium browser tent");
    await supplierPage
      .getByLabel("Category", { exact: false })
      .selectOption("Camping Equipment");
    await supplierPage
      .getByLabel("Price per Day", { exact: false })
      .fill("200");
    await supplierPage.getByRole("button", { name: "Publish Listing" }).click();
    await expect(supplierPage).toHaveURL(/supplier\/products$/);
    await expect(
      supplierPage.getByRole("heading", { name: "Premium browser tent" }),
    ).toBeVisible();
    console.log(
      "Subscription prompt, manual activation and second listing published",
    );
    await supplierPage.goto("http://127.0.0.1:5179/supplier/rentals");
    await supplierPage
      .getByRole("button", { name: "Approve", exact: true })
      .click();
    await supplierPage
      .getByRole("button", { name: "Confirm handover", exact: true })
      .click();
    await customerPage.reload();
    await customerPage
      .getByRole("button", { name: "Mark returned", exact: true })
      .click();
    await supplierPage.reload();
    await supplierPage
      .getByRole("button", { name: "Verify return", exact: true })
      .click();
    await customerPage.reload();
    await customerPage
      .getByRole("button", { name: "Write review", exact: true })
      .click();
    await customerPage
      .getByRole("button", { name: "Publish review", exact: true })
      .click();
    await expect(customerPage.getByRole("dialog")).toHaveCount(0);
    console.log(
      "Browser booking → approval → handover → return → completion → review passed",
    );
    await customerContext.close();
    await supplierContext.close();
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.goto("http://127.0.0.1:5179/customer/dashboard");
    await expect(page).toHaveURL(/login/);
    for (const route of [
      "/help",
      "/how-it-works",
      "/forgot-password",
      "/reset-password/" + "a".repeat(64),
      "/community",
    ]) {
      await page.goto("http://127.0.0.1:5179" + route);
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page.getByRole("heading", { name: "Page not found" }).count(),
        0,
      );
    }
    console.log("Mobile public routes and protected-route redirect passed");
    await page.goto("http://127.0.0.1:5179/forgot-password");
    await page.getByLabel("Email address").fill("customer@test.example");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText(
      "If an account exists",
    );
    const mail = JSON.parse(
      fs.readFileSync(
        path.join(
          process.env.MAIL_OUTBOX,
          fs.readdirSync(process.env.MAIL_OUTBOX)[0],
        ),
      ),
    );
    await page.goto(
      "http://127.0.0.1:5179/reset-password/" + mail.url.split("/").pop(),
    );
    await page
      .getByLabel("New password", { exact: true })
      .fill("browser-replacement-123");
    await page.getByLabel("Confirm password").fill("browser-replacement-123");
    await page
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    await expect(
      page.getByText("Password updated.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Sign in", exact: true })
      .last()
      .click();
    await page.locator("input[type=email]").fill("customer@test.example");
    await page.locator("input[type=password]").fill("browser-replacement-123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/customer\/dashboard/);
    console.log("Browser reset email → password reset → login passed");
    const guest = await browser.newPage();
    const returnDate = new Date(Date.parse(today) + 2 * 86400000)
      .toISOString()
      .slice(0, 10);
    const destination = `http://127.0.0.1:5179/customer/booking/${product}?start_date=${today}&end_date=${returnDate}`;
    await guest.goto(
      `http://127.0.0.1:5179/browse?startDate=${today}&endDate=${returnDate}`,
    );
    await guest
      .getByRole("link", { name: "Browser Camera", exact: true })
      .click();
    await guest.getByRole("button", { name: "Reserve this item" }).click();
    await expect(guest).toHaveURL(/login$/);
    await guest.locator("input[type=email]").fill("customer@test.example");
    await guest.locator("input[type=password]").fill("browser-replacement-123");
    await guest.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(guest).toHaveURL(destination);
    await expect(guest.getByLabel("Start date")).toHaveValue(today);
    await expect(guest.getByLabel("End date")).toHaveValue(returnDate);
    await guest.close();
  } finally {
    await browser?.close();
    await vite.close();
    require("../src/socket").getIO().close();
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
