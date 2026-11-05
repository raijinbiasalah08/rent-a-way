// Runs the real PostgreSQL dialect against the embedded PostgreSQL engine, without cloud credentials.
const { PGlite } = require("@electric-sql/pglite");
class Pool {
  constructor() {
    this.db = new PGlite();
    this.tail = Promise.resolve();
  }
  async acquire() {
    const previous = this.tail;
    let release;
    this.tail = new Promise((r) => {
      release = r;
    });
    await previous;
    return release;
  }
  async raw(sql, params) {
    const result = params
      ? await this.db.query(sql, params)
      : (await this.db.exec(sql)).at(-1);
    return { ...result, rowCount: result.affectedRows };
  }
  async query(sql, params) {
    const release = await this.acquire();
    try {
      return await this.raw(sql, params);
    } finally {
      release();
    }
  }
  async connect() {
    const release = await this.acquire();
    return { query: (s, p) => this.raw(s, p), release };
  }
  async end() {
    await this.db.close();
  }
}
require.cache[require.resolve("pg")] = {
  exports: { Pool, types: { setTypeParser() {} } },
};
process.env.DATABASE_URL = "postgresql://test-only";
