// Read the existing SQLite database through a consistent backup; migrate only the copy.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const { DatabaseSync, backup } = require("node:sqlite");
async function main() {
  const sourcePath = path.resolve(process.argv[2] || "rentaway.db");
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "rentaway-migration-"),
  );
  const target = path.join(directory, "copy.db");
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  const tables = ["users", "products", "rentals", "messages", "reviews"];
  const before = Object.fromEntries(
    tables.map((table) => [
      table,
      source.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,
    ]),
  );
  const paymentTable = source
    .prepare(
      "SELECT name FROM sqlite_master WHERE name IN ('payments','legacy_payments_archive') ORDER BY name LIMIT 1",
    )
    .get();
  const financialCount = paymentTable
    ? source.prepare(`SELECT COUNT(*) AS count FROM ${paymentTable.name}`).get()
        .count
    : 0;
  await backup(source, target);
  source.close();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_PATH = target;
  delete process.env.DATABASE_URL;
  const db = require("../src/db/database");
  try {
    await db.initialize();
    await db.initialize();
    const after = {};
    for (const table of tables)
      after[table] = (
        await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()
      ).count;
    assert.deepEqual(after, before);
    const archive = await db
      .prepare(
        "SELECT name FROM sqlite_master WHERE name='legacy_payments_archive'",
      )
      .get();
    const archived = archive
      ? (
          await db
            .prepare("SELECT COUNT(*) AS count FROM legacy_payments_archive")
            .get()
        ).count
      : 0;
    assert.equal(archived, financialCount);
    assert.deepEqual(await db.prepare("PRAGMA foreign_key_check").all(), []);
    console.log(
      JSON.stringify({
        sourceUnchanged: true,
        before,
        after,
        legacyPaymentsPreserved: archived,
        foreignKeyErrors: 0,
      }),
    );
  } finally {
    await db.close();
    for (const file of [target, target + "-wal", target + "-shm"])
      if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(directory);
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
