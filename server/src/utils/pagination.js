const db = require("../db/database");
async function paginated(sql, params, req) {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const page = Math.min(100000, Math.max(1, parseInt(req.query.page) || 1));
  const { total } = await db
    .prepare(`SELECT COUNT(*) AS total FROM (${sql}) AS results`)
    .get(...params);
  const data = await db
    .prepare(`${sql} LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);
  return {
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
module.exports = { paginated };
