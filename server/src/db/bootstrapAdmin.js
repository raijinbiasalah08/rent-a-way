require("dotenv").config();

const bcrypt = require("bcryptjs");
const { randomUUID: uuidv4 } = require("node:crypto");
const db = require("./database");

async function bootstrapAdmin() {
  await db.initialize();
  await db.transaction(async () => {
    if (db.dialect === "postgres")
      await db.exec("SELECT pg_advisory_xact_lock(7834522)");
    const existingAdmin = await db
      .prepare(
        "SELECT id FROM users WHERE role = 'admin' AND is_active = 1 LIMIT 1",
      )
      .get();
    if (existingAdmin) return;
    const email = String(process.env.INITIAL_ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();
    const password = String(process.env.INITIAL_ADMIN_PASSWORD || "");
    const name = String(
      process.env.INITIAL_ADMIN_NAME || "RentAway Administrator",
    ).trim();

    if (!email || !password) {
      throw new Error(
        "Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD before the initial deployment.",
      );
    }
    if (!require("../middleware/validation").email.safeParse(email).success)
      throw new Error("Set a valid INITIAL_ADMIN_EMAIL");
    if (
      !require("../middleware/validation").password.safeParse(password).success
    ) {
      throw new Error("INITIAL_ADMIN_PASSWORD must contain 12–72 characters.");
    }

    const existingUser = await db
      .prepare("SELECT id FROM users WHERE LOWER(email) = ?")
      .get(email);
    if (existingUser) {
      throw new Error(
        "INITIAL_ADMIN_EMAIL belongs to an existing non-admin account; no role was changed.",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db
      .prepare(
        `
    INSERT INTO users (id, name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, 'admin', ?)
  `,
      )
      .run(
        uuidv4(),
        name || "RentAway Administrator",
        email,
        passwordHash,
        new Date().toISOString(),
      );

    console.log("Initial admin account created.");
  });
}

bootstrapAdmin()
  .catch((error) => {
    console.error("Could not create the initial admin account:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
