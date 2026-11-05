const express = require("express");
const { randomUUID: uuidv4 } = require("node:crypto");
const db = require("../db/database");
const { authenticate, authorize } = require("../middleware/auth");
const uploadsDir = require("../utils/uploads");

const router = express.Router();

const multer = require("multer");

const upload = require("../utils/imageStorage");
router.get("/product/:productId", async (req, res) =>
  res.json({
    success: true,
    data: await db
      .prepare(
        "SELECT r.*,u.name AS reviewer_name,u.avatar AS reviewer_avatar FROM reviews r JOIN users u ON u.id = r.customer_id WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT 100",
      )
      .all(req.params.productId),
  }),
);

router.post(
  "/",
  authenticate,
  authorize("customer"),
  upload.single("image"),
  async (req, res) => {
    try {
      const { product_id, rating, comment } = req.body;
      let rental_id = req.body.rental_id;
      if (!rental_id) {
        const candidate = await db
          .prepare(
            "SELECT id FROM rentals WHERE product_id = ? AND customer_id = ? AND status = 'completed' AND id NOT IN (SELECT rental_id FROM reviews WHERE rental_id IS NOT NULL) ORDER BY created_at DESC LIMIT 1",
          )
          .get(product_id, req.user.id);
        rental_id = candidate?.id;
      }
      if (
        !product_id ||
        !rental_id ||
        !Number.isInteger(Number(rating)) ||
        rating < 1 ||
        rating > 5 ||
        (comment?.length || 0) > 5000
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid product or rating" });
      }

      const pastRental = await db
        .prepare(
          `
      SELECT id FROM rentals 
      WHERE product_id = ? AND customer_id = ? AND status = 'completed' AND id = ?
      LIMIT 1
    `,
        )
        .get(product_id, req.user.id, rental_id);

      if (!pastRental) {
        return res.status(403).json({
          success: false,
          message: "You can only review products you have rented and returned",
        });
      }

      const id = uuidv4();
      if (
        await db
          .prepare("SELECT id FROM reviews WHERE rental_id = ?")
          .get(rental_id)
      )
        return res.status(409).json({
          success: false,
          message: "This rental already has a review",
        });
      const imageUrl = req.file ? req.file.url : null;

      await db
        .prepare(
          `
      INSERT INTO reviews (id, product_id, customer_id, rating, comment, image_url, created_at, rental_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
        )
        .run(
          id,
          product_id,
          req.user.id,
          Number(rating),
          comment || null,
          imageUrl,
          new Date().toISOString(),
          rental_id,
        );

      const review = await db
        .prepare("SELECT * FROM reviews WHERE id = ?")
        .get(id);
      res.status(201).json({ success: true, data: review });
    } catch (error) {
      if (
        error.code === "23505" ||
        error.code === "ERR_SQLITE_CONSTRAINT_UNIQUE" ||
        error.errcode === 2067
      )
        return res.status(409).json({
          success: false,
          message: "This rental already has a review",
        });
      console.error({ route: req.originalUrl, code: error.code || error.name });
      res.status(500).json({
        success: false,
        message: "Unable to complete the request. Please try again.",
      });
    }
  },
);

module.exports = router;
