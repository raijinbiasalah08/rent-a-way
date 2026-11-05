require("dotenv").config();
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const tables = [
  "users",
  "products",
  "product_images",
  "rentals",
  "reviews",
  "community_posts",
  "complaints",
  "favorites",
  "notifications",
  "messages",
  "blocked_users",
  "google_identities",
  "community_likes",
  "admin_audit",
  "uploaded_assets",
];
async function main() {
  const [mode, input, output] = process.argv.slice(2);
  if (mode === "export") {
    if (!input || !output)
      throw new Error(
        "Usage: node src/db/transfer.js export source.db backup.json",
      );
    const source = new DatabaseSync(input, { readOnly: true });
    const existing = source
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((t) => t.name);
    const data = {
      version: 1,
      createdAt: new Date().toISOString(),
      tables: {},
    };
    for (const table of [
      ...tables,
      ...existing.filter((t) => t === "payments" || t.startsWith("legacy_")),
    ])
      if (existing.includes(table))
        data.tables[table] = source.prepare(`SELECT * FROM "${table}"`).all();
    fs.writeFileSync(output, JSON.stringify(data, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    source.close();
    console.log(
      Object.fromEntries(
        Object.entries(data.tables).map(([name, rows]) => [name, rows.length]),
      ),
    );
    return;
  }
  if (mode !== "import" || !input)
    throw new Error(
      "Usage: node src/db/transfer.js import backup.json (empty DATABASE_URL target required)",
    );
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL to the destination PostgreSQL database");
  const data = JSON.parse(fs.readFileSync(input, "utf8"));
  if (data.version !== 1 || !data.tables)
    throw new Error("Unsupported backup format");
  const db = require("./database");
  try {
    await db.initialize();
    await db.transaction(async () => {
      for (const table of tables)
        if (
          (await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get())
            .count
        )
          throw new Error(
            "Destination is not empty; import stopped without overwriting data",
          );
      for (const table of tables) {
        const columns = (
          await db
            .prepare(
              "SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=?",
            )
            .all(table)
        ).map((c) => c.column_name);
        for (const row of data.tables[table] || []) {
          const keys = Object.keys(row).filter((k) => columns.includes(k));
          await db
            .prepare(
              `INSERT INTO ${table} (${keys.map((k) => `"${k}"`).join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
            )
            .run(...keys.map((k) => row[k]));
        }
        const count = (
          await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()
        ).count;
        if (count !== (data.tables[table] || []).length)
          throw new Error(`Count mismatch for ${table}`);
        console.log(`${table}: ${count} records verified`);
      }
      // Obsolete financial fields remain preserved in the original, owner-controlled backup.
    });
  } finally {
    await db.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
