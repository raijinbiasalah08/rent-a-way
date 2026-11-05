const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const cloudinary = require("cloudinary").v2;
const uploadsDir = require("./uploads");
const db = require("../db/database");
const { removeAsset } = require("./assets");
const cloud = Boolean(process.env.CLOUDINARY_URL);
if (cloud) cloudinary.config({ secure: true });
const types = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};
const storage = {
  _handleFile(req, file, callback) {
    const chunks = [];
    let size = 0;
    file.stream.on("data", (chunk) => {
      size += chunk.length;
      chunks.push(chunk);
    });
    file.stream.on("error", callback);
    file.stream.on("end", async () => {
      try {
        if (file.stream.truncated)
          throw Object.assign(new Error("Image must be at most 5 MB"), {
            status: 400,
          });
        const buffer = Buffer.concat(chunks);
        const valid =
          file.mimetype === "image/jpeg"
            ? buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
            : file.mimetype === "image/png"
              ? buffer
                  .subarray(0, 8)
                  .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              : buffer.toString("ascii", 0, 4) === "RIFF" &&
                buffer.toString("ascii", 8, 12) === "WEBP";
        if (!valid)
          throw Object.assign(new Error("Invalid image content"), {
            status: 400,
          });
        const filename = `${randomUUID()}${types[file.mimetype][0]}`;
        if (cloud) {
          const result = await new Promise((resolve, reject) =>
            cloudinary.uploader
              .upload_stream(
                { folder: "rentaway", resource_type: "image" },
                (error, result) => (error ? reject(error) : resolve(result)),
              )
              .end(buffer),
          );
          try {
            await db
              .prepare(
                "INSERT INTO uploaded_assets (url,public_id,filename,created_at) VALUES (?,?,?,?)",
              )
              .run(
                result.secure_url,
                result.public_id,
                null,
                new Date().toISOString(),
              );
          } catch (error) {
            await cloudinary.uploader.destroy(result.public_id);
            throw error;
          }
          callback(null, {
            filename,
            url: result.secure_url,
            public_id: result.public_id,
            size,
          });
        } else {
          if (process.env.NODE_ENV === "production")
            throw new Error("Configure CLOUDINARY_URL for durable uploads");
          await fs.writeFile(path.join(uploadsDir, filename), buffer);
          await db
            .prepare(
              "INSERT INTO uploaded_assets (url,public_id,filename,created_at) VALUES (?,?,?,?)",
            )
            .run(
              `/uploads/${filename}`,
              null,
              filename,
              new Date().toISOString(),
            );
          callback(null, { filename, url: `/uploads/${filename}`, size });
        }
      } catch (error) {
        callback(error);
      }
    });
  },
  _removeFile(req, file, callback) {
    removeAsset(file.url).then(() => callback(null), callback);
  },
};
const uploader = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 30 },
  fileFilter(req, file, cb) {
    const allowed = types[file.mimetype]?.includes(
      path.extname(file.originalname).toLowerCase(),
    );
    cb(
      allowed
        ? null
        : Object.assign(
            new Error("Only JPG, PNG, or WebP images are allowed"),
            { status: 400 },
          ),
      Boolean(allowed),
    );
  },
});
module.exports = {
  single(field) {
    const middleware = uploader.single(field);
    return (req, res, next) => {
      res.once("finish", () => {
        if (res.statusCode >= 400 && req.file?.url)
          removeAsset(req.file.url).catch(() =>
            console.error({ event: "asset_cleanup_failed" }),
          );
      });
      middleware(req, res, next);
    };
  },
};
