const multer = require("multer");
const db = require("../db/database");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 30 } }).single("identityDocument");

function requireIdentity(req) {
  const file = req.file;
  if (!file) throw Object.assign(new Error("Upload a government-issued or school ID to create your account."), { status: 400 });
  const bytes = file.buffer;
  const jpeg = bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  const type = jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : null;
  if (!type || file.mimetype !== type) throw Object.assign(new Error("Upload a JPG, PNG, or WebP ID image, up to 5 MB."), { status: 400 });
  return { type, data: bytes.toString("base64") };
}

async function saveIdentity(id, document, date) {
  await db.prepare("INSERT INTO registration_ids (user_id, content_type, image_data, created_at) VALUES (?,?,?,?)").run(id, document.type, document.data, date);
}
module.exports = { upload, requireIdentity, saveIdentity };
