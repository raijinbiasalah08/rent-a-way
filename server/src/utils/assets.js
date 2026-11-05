const db = require("../db/database");
const fs = require("node:fs/promises");
const path = require("node:path");
const uploadsDir = require("./uploads");

// Only delete assets that this application registered, never arbitrary remote URLs.
async function removeAsset(url) {
  if (!url) return;
  const asset = await db
    .prepare("SELECT * FROM uploaded_assets WHERE url = ?")
    .get(url);
  if (!asset) return;
  try {
    if (asset.filename && path.basename(asset.filename) === asset.filename)
      await fs.unlink(path.join(uploadsDir, asset.filename)).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    await db.prepare("DELETE FROM uploaded_assets WHERE url = ?").run(url);
  } catch (error) {
    // Keep the registry row so a failed provider deletion can be retried.
    console.error({
      event: "asset_cleanup_failed",
      code: error.code || error.name,
    });
  }
}
module.exports = { removeAsset };
