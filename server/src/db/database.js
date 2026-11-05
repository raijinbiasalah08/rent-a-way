const { AsyncLocalStorage } = require("node:async_hooks");
const context = new AsyncLocalStorage();
const pg = Boolean(process.env.DATABASE_URL);
let engine;
let queue = Promise.resolve();
const locked = async (callback) => {
  const previous = queue;
  let release;
  queue = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await callback();
  } finally {
    release();
  }
};
if (pg) {
  const { Pool, types } = require("pg");
  types.setTypeParser(20, (value) => Number(value));
  engine = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 15000,
  });
} else {
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Production requires DATABASE_URL for persistent PostgreSQL storage.",
    );
  const path = require("node:path");
  const dbPath = path.resolve(
    process.env.DATABASE_PATH || path.join(__dirname, "../../rentaway.db"),
  );
  require("node:fs").mkdirSync(path.dirname(dbPath), { recursive: true });
  engine = new (require("node:sqlite").DatabaseSync)(dbPath);
  engine.exec(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
  );
}
function postgresSQL(sql) {
  let index = 0;
  return sql.replace(/'(?:''|[^'])*'|\?/g, (match) =>
    match === "?" ? `$${++index}` : match,
  );
}
async function execute(sql, params, mode) {
  const run = async () => {
    if (pg) {
      const result = await (context.getStore() || engine).query(
        postgresSQL(sql),
        params,
      );
      return mode === "get"
        ? result.rows[0]
        : mode === "all"
          ? result.rows
          : { changes: result.rowCount };
    }
    return engine
      .prepare(sql)
      [mode](...params.map((p) => (p === undefined ? null : p)));
  };
  return pg || context.getStore() ? run() : locked(run);
}
const db = {
  dialect: pg ? "postgres" : "sqlite",
  prepare(sql) {
    return Object.fromEntries(
      ["get", "all", "run"].map((mode) => [
        mode,
        (...params) => execute(sql, params, mode),
      ]),
    );
  },
  async exec(sql) {
    const run = () =>
      pg ? (context.getStore() || engine).query(sql) : engine.exec(sql);
    return pg || context.getStore() ? run() : locked(run);
  },
  async transaction(callback) {
    if (context.getStore()) return callback();
    const run = async () => {
      const connection = pg ? await engine.connect() : true;
      return context.run(connection, async () => {
        try {
          await db.exec(pg ? "BEGIN" : "BEGIN IMMEDIATE");
          const value = await callback();
          await db.exec("COMMIT");
          return value;
        } catch (error) {
          await db.exec("ROLLBACK");
          throw error;
        } finally {
          if (pg) connection.release();
        }
      });
    };
    return pg ? run() : locked(run);
  },
  async initialize() {
    const { sql, columns } = require("./schema");
    await db.transaction(async () => {
      if (pg) await db.exec("SELECT pg_advisory_xact_lock(7834521)");
      await db.exec(
        pg
          ? sql
              .replaceAll(
                "INTEGER PRIMARY KEY AUTOINCREMENT",
                "SERIAL PRIMARY KEY",
              )
              .replaceAll(" REAL", " DOUBLE PRECISION")
          : sql,
      );
      for (const [table, column, type] of columns) {
        const exists = pg
          ? await db
              .prepare(
                "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?",
              )
              .get(table, column)
          : (await db.prepare(`PRAGMA table_info(${table})`).all()).find(
              (c) => c.name === column,
            );
        if (!exists)
          await db.exec(
            `ALTER TABLE ${table} ADD COLUMN ${column} ${pg ? type.replace("REAL", "DOUBLE PRECISION") : type}`,
          );
      }
      await db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS review_rental_unique ON reviews(rental_id);
        CREATE INDEX IF NOT EXISTS rental_availability ON rentals(product_id, status, start_date, end_date);
        CREATE INDEX IF NOT EXISTS messages_participants ON messages(sender_id, receiver_id, created_at);
        CREATE INDEX IF NOT EXISTS notifications_owner ON notifications(user_id, is_read, created_at);
        CREATE INDEX IF NOT EXISTS products_supplier ON products(supplier_id, is_active);
        CREATE INDEX IF NOT EXISTS rentals_customer ON rentals(customer_id, created_at);
      `);
      const tables = pg
        ? await db
            .prepare(
              "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = current_schema()",
            )
            .all()
        : await db
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
            .all();
      if (tables.some((t) => t.name === "payments"))
        await db.exec("ALTER TABLE payments RENAME TO legacy_payments_archive");
      for (const [table, fields] of [
        [
          "users",
          [
            "gcash_number",
            "gcash_name",
            "gcash_qr",
            "maya_number",
            "maya_name",
            "maya_qr",
          ],
        ],
        ["rentals", ["payment_intent_id", "security_deposit"]],
      ]) {
        const names = pg
          ? (
              await db
                .prepare(
                  "SELECT column_name AS name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ?",
                )
                .all(table)
            ).map((c) => c.name)
          : (await db.prepare(`PRAGMA table_info(${table})`).all()).map(
              (c) => c.name,
            );
        const found = fields.filter((f) => names.includes(f));
        if (found.length) {
          await db.exec(
            `CREATE TABLE IF NOT EXISTS legacy_${table}_financial_archive AS SELECT id, ${found.join(", ")} FROM ${table}`,
          );
          for (const field of found)
            await db.exec(`ALTER TABLE ${table} DROP COLUMN ${field}`);
        }
      }
      await db
        .prepare(
          "INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?) ON CONFLICT(version) DO NOTHING",
        )
        .run(new Date().toISOString());
      if (
        !(await db
          .prepare("SELECT version FROM schema_migrations WHERE version = 2")
          .get())
      ) {
        await db.exec(`CREATE TABLE IF NOT EXISTS uploaded_assets (url TEXT PRIMARY KEY, public_id TEXT, filename TEXT, created_at TEXT NOT NULL);
          ALTER TABLE product_images ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
          CREATE INDEX IF NOT EXISTS products_catalog ON products(is_active, category, barangay);
          CREATE INDEX IF NOT EXISTS users_role ON users(role, is_active);`);
        await db
          .prepare(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (2, ?)",
          )
          .run(new Date().toISOString());
      }
      for (const b of require("../utils/roxasLocation").ROXAS_BARANGAYS) {
        await db
          .prepare(
            "INSERT INTO roxas_barangays (name, latitude, longitude, description) VALUES (?, ?, ?, ?) ON CONFLICT(name) DO NOTHING",
          )
          .run(b.name, b.lat, b.lng, b.description);
      }
    });
  },
  async close() {
    return pg ? engine.end() : engine.close();
  },
};
module.exports = db;
