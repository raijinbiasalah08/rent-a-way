const express = require("express");
const multer = require("multer");
const { randomUUID: uuidv4 } = require("node:crypto");
const db = require("../db/database");
const { authenticate, authorize } = require("../middleware/auth");
const {
  isWithinRoxas,
  isValidRoxasBarangay,
  formatRoxasAddress,
  getBarangayCoordinates,
  ROXAS_BARANGAYS,
} = require("../utils/roxasLocation");
const uploadsDir = require("../utils/uploads");

const router = express.Router();

function validateAndNormalizeCoordinates(latitude, longitude) {
  if (
    latitude == null ||
    longitude == null ||
    latitude === "" ||
    longitude === ""
  ) {
    return { valid: false, lat: null, lng: null };
  }
  let lat = Number(latitude);
  let lng = Number(longitude);
  if (isNaN(lat) || isNaN(lng)) {
    return { valid: false, lat: null, lng: null };
  }
  // Prevent reversed coordinates: in Philippines lat is ~4.5 to 21.5, lng is ~116.5 to 127.0
  if (lat > 50 && lng < 50) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, lat: null, lng: null };
  }
  return {
    valid: true,
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
  };
}

const upload = require("../utils/imageStorage");
async function ownsProduct(req, res, next) {
  const product = await db
    .prepare("SELECT supplier_id FROM products WHERE id = ?")
    .get(req.params.id);
  if (!product)
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  if (req.user.role !== "admin" && product.supplier_id !== req.user.id)
    return res.status(403).json({ success: false, message: "Forbidden" });
  next();
}
const { z, validate } = require("../middleware/validation");
const productSchema = z
  .object({
    title: z.string().trim().min(2).max(150),
    description: z.string().max(10000).optional(),
    category: z.enum([
      "Cameras",
      "Camping",
      "Sports",
      "Event",
      "Household",
      "School",
    ]),
    price_per_day: z.coerce.number().nonnegative().max(1000000),
    min_days: z.coerce.number().int().min(1).default(1),
    max_days: z.coerce.number().int().min(1).max(365).default(30),
    availability: z
      .enum(["available", "unavailable", "rented", "maintenance"])
      .optional(),
  })
  .passthrough()
  .refine(
    (p) => p.max_days >= p.min_days,
    "Maximum rental duration must not be shorter than minimum",
  );
router.get("/locations/barangays", async (req, res) =>
  res.json({
    success: true,
    data: await db.prepare("SELECT * FROM roxas_barangays ORDER BY name").all(),
  }),
);

router.get("/", async (req, res) => {
  try {
    let {
      search,
      category,
      barangay,
      minPrice,
      maxPrice,
      availability,
      startDate,
      endDate,
      minLat,
      maxLat,
      minLng,
      maxLng,
      userLat,
      userLng,
      radiusKm,
      page = 1,
      limit = 12,
    } = req.query;
    for (const key of [
      "minPrice",
      "maxPrice",
      "minLat",
      "maxLat",
      "minLng",
      "maxLng",
      "userLat",
      "userLng",
      "radiusKm",
      "page",
      "limit",
    ]) {
      if (
        req.query[key] !== undefined &&
        (!Number.isFinite(Number(req.query[key])) ||
          Math.abs(Number(req.query[key])) > 10000000)
      )
        return res
          .status(400)
          .json({ success: false, message: `Invalid ${key}` });
    }
    if (startDate || endDate) {
      const { date } = require("../middleware/validation");
      if (
        !date.safeParse(startDate).success ||
        !date.safeParse(endDate).success ||
        endDate <= startDate
      )
        return res
          .status(400)
          .json({ success: false, message: "Choose a valid date range" });
    }
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 12));
    const offset = (page - 1) * limit;

    let query = `SELECT p.*, u.name as supplier_name, 
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image, 
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      ((SELECT COUNT(*) FROM rentals r2 JOIN products p2 ON r2.product_id = p2.id WHERE p2.supplier_id = u.id AND r2.status IN ('completed', 'returned')) >= 5 
       AND 
       (SELECT AVG(rating) FROM reviews rev JOIN products p3 ON rev.product_id = p3.id WHERE p3.supplier_id = u.id) >= 4.8) as is_super_supplier
      FROM products p JOIN users u ON p.supplier_id = u.id `;
    let countQuery = "SELECT COUNT(*) as total FROM products p ";

    query += " WHERE p.is_active = 1";
    countQuery += " WHERE p.is_active = 1";

    const params = [];

    if (search) {
      const term = `%${String(search).slice(0, 200)}%`;
      query +=
        " AND (LOWER(p.title) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?))";
      countQuery +=
        " AND (LOWER(p.title) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?))";
      params.push(term, term);
    }
    if (category) {
      query += " AND p.category = ?";
      countQuery += " AND p.category = ?";
      params.push(category);
    }
    if (barangay) {
      query += " AND p.barangay = ?";
      countQuery += " AND p.barangay = ?";
      params.push(barangay);
    }
    if (minPrice) {
      query += " AND p.price_per_day >= ?";
      countQuery += " AND p.price_per_day >= ?";
      params.push(minPrice);
    }
    if (maxPrice) {
      query += " AND p.price_per_day <= ?";
      countQuery += " AND p.price_per_day <= ?";
      params.push(maxPrice);
    }
    if (availability) {
      query += " AND p.availability = ?";
      countQuery += " AND p.availability = ?";
      params.push(availability);
    }
    if (startDate && endDate) {
      const dateFilter = ` AND p.id NOT IN (
        SELECT product_id FROM rentals
        WHERE status IN ('pending', 'approved', 'active', 'returned')
        AND (start_date < ? AND end_date > ?)
      )`;
      query += dateFilter;
      countQuery += dateFilter;
      params.push(endDate, startDate);
    }

    // Radius or Bounding Box filtering for maps
    if (userLat && userLng && radiusKm && !isNaN(Number(radiusKm))) {
      const rad = parseFloat(radiusKm);
      const uLat = parseFloat(userLat);
      const uLng = parseFloat(userLng);
      const latDelta = rad / 111.0;
      const lngDelta =
        rad / (111.0 * Math.max(0.1, Math.cos(uLat * (Math.PI / 180))));
      const geoFilter =
        " AND p.latitude >= ? AND p.latitude <= ? AND p.longitude >= ? AND p.longitude <= ?";
      query += geoFilter;
      countQuery += geoFilter;
      params.push(
        uLat - latDelta,
        uLat + latDelta,
        uLng - lngDelta,
        uLng + lngDelta,
      );
    } else if (minLat && maxLat && minLng && maxLng) {
      const geoFilter =
        " AND p.latitude >= ? AND p.latitude <= ? AND p.longitude >= ? AND p.longitude <= ?";
      query += geoFilter;
      countQuery += geoFilter;
      params.push(
        parseFloat(minLat),
        parseFloat(maxLat),
        parseFloat(minLng),
        parseFloat(maxLng),
      );
    }

    query += " ORDER BY p.created_at DESC ";

    query += " LIMIT ? OFFSET ?";

    const products = await db.prepare(query).all(...[...params, limit, offset]);
    const { total } = await db.prepare(countQuery).get(...params);

    res.json({
      success: true,
      data: {
        products,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const categories = [
      "Cameras",
      "Camping",
      "Sports",
      "Event",
      "Household",
      "School",
    ];
    const counts = await db
      .prepare(
        "SELECT category, COUNT(*) as count FROM products WHERE is_active = 1 GROUP BY category",
      )
      .all();
    const result = categories.map((cat) => {
      const found = counts.find((c) => c.category === cat);
      return { name: cat, count: found ? found.count : 0 };
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// Supplier's own listings
router.get(
  "/mine",
  authenticate,
  authorize("supplier", "admin"),
  async (req, res) => {
    try {
      const products = await db
        .prepare(
          `
      SELECT p.*,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count
      FROM products p
      WHERE p.supplier_id = ? AND p.is_active = 1
      ORDER BY p.created_at DESC
    `,
        )
        .all(req.user.id);
      res.json({ success: true, data: products });
    } catch (error) {
      console.error({ route: req.originalUrl, code: error.code || error.name });
      res.status(500).json({
        success: false,
        message: "Unable to complete the request. Please try again.",
      });
    }
  },
);

// Geocoding Proxy: Reverse Geocode (Lat/Lng -> Human address) restricted to Roxas
router.get("/geocode/reverse", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "lat and lng parameters are required",
      });
    }
    if (!isWithinRoxas(lat, lng)) {
      return res.status(400).json({
        success: false,
        message: "Only locations within Roxas, Oriental Mindoro are allowed.",
      });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "RentAWay-App/1.0 (contact@rentaway.ph)",
        },
      },
    );
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ success: false, message: "Geocoding service unavailable" });
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

// Geocoding Proxy: Search Address restricted to Roxas, Oriental Mindoro
router.get("/geocode/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Query string q is required" });
    }
    const cleanQuery = `${q.trim()}, Roxas, Oriental Mindoro, Philippines`;
    const viewbox = "121.36,12.68,121.57,12.49";
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&viewbox=${viewbox}&bounded=1&countrycodes=ph&limit=5&addressdetails=1`,
      {
        headers: {
          "User-Agent": "RentAWay-App/1.0 (contact@rentaway.ph)",
        },
      },
    );
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ success: false, message: "Geocoding service unavailable" });
    }
    const data = await response.json();
    const filtered = (data || []).filter((item) =>
      isWithinRoxas(Number(item.lat), Number(item.lon)),
    );
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await db
      .prepare(
        `
      SELECT p.*, u.name as supplier_name, u.avatar as supplier_avatar, u.address as supplier_address, u.barangay as supplier_barangay,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
      ((SELECT COUNT(*) FROM rentals r2 JOIN products p2 ON r2.product_id = p2.id WHERE p2.supplier_id = u.id AND r2.status IN ('completed', 'returned')) >= 5 
       AND 
       (SELECT AVG(rating) FROM reviews rev JOIN products p3 ON rev.product_id = p3.id WHERE p3.supplier_id = u.id) >= 4.8) as is_super_supplier
      FROM products p 
      JOIN users u ON p.supplier_id = u.id 
      WHERE p.id = ? AND p.is_active = 1
    `,
      )
      .get(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const images = await db
      .prepare(
        "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id",
      )
      .all(product.id);
    product.images = images.sort((a, b) => b.is_primary - a.is_primary);

    const reviews = await db
      .prepare(
        `
      SELECT r.id, r.rating, r.comment as text, r.image_url, r.created_at as date, u.name, u.avatar
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `,
      )
      .all(product.id);
    product.reviews = reviews;

    res.json({ success: true, data: product });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.post(
  "/",
  authenticate,
  authorize("supplier"),
  validate(productSchema),
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        price_per_day,
        min_days,
        max_days,
        specs,
        location,
        barangay,
        latitude,
        longitude,
      } = req.body;
      const id = uuidv4();
      const coords = validateAndNormalizeCoordinates(latitude, longitude);

      let finalLat = coords.valid ? coords.lat : null;
      let finalLng = coords.valid ? coords.lng : null;
      let finalLoc = location ? String(location).trim() : null;
      let finalBarangay = barangay ? String(barangay).trim() : null;

      // If coordinates, location, or barangay are not provided in payload, fallback to supplier's verified profile location
      if (!finalLat || !finalLng || !finalLoc || !finalBarangay) {
        const supplier = await db
          .prepare(
            "SELECT address, barangay, latitude, longitude FROM users WHERE id = ?",
          )
          .get(req.user.id);
        if (supplier) {
          if (!finalLoc && supplier.address) finalLoc = supplier.address;
          if (!finalBarangay && supplier.barangay)
            finalBarangay = supplier.barangay;
          if (!finalLat && supplier.latitude) finalLat = supplier.latitude;
          if (!finalLng && supplier.longitude) finalLng = supplier.longitude;
        }
      }

      // Strictly enforce Roxas, Oriental Mindoro location boundary
      if (finalLat && finalLng && !isWithinRoxas(finalLat, finalLng)) {
        return res.status(400).json({
          success: false,
          message: "Only locations within Roxas, Oriental Mindoro are allowed.",
        });
      }

      // Auto-derive coordinates from barangay if coords are still missing
      if ((!finalLat || !finalLng) && isValidRoxasBarangay(finalBarangay)) {
        const derived = getBarangayCoordinates(finalBarangay);
        finalLat = derived[0];
        finalLng = derived[1];
      }

      if (
        !isValidRoxasBarangay(finalBarangay) ||
        !isWithinRoxas(finalLat, finalLng)
      )
        return res.status(400).json({
          success: false,
          message:
            "Set a valid pickup location in your profile before listing equipment",
        });

      await db
        .prepare(
          `
      INSERT INTO products (id, supplier_id, title, description, category, price_per_day, min_days, max_days, specs, location, barangay, latitude, longitude, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
        )
        .run(
          id,
          req.user.id,
          title,
          description,
          category,
          price_per_day,
          min_days,
          max_days,
          specs,
          finalLoc,
          finalBarangay,
          finalLat,
          finalLng,
          new Date().toISOString(),
        );

      const product = await db
        .prepare("SELECT * FROM products WHERE id = ?")
        .get(id);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      console.error({ route: req.originalUrl, code: error.code || error.name });
      res.status(500).json({
        success: false,
        message: "Unable to complete the request. Please try again.",
      });
    }
  },
);

router.put(
  "/:id",
  authenticate,
  authorize("supplier", "admin"),
  validate(productSchema),
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        price_per_day,
        min_days,
        max_days,
        specs,
        availability,
        location,
        barangay,
        latitude,
        longitude,
      } = req.body;
      const product = await db
        .prepare("SELECT * FROM products WHERE id = ?")
        .get(req.params.id);
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      if (req.user.role !== "admin" && product.supplier_id !== req.user.id) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      let updateQuery = `
      UPDATE products SET title = ?, description = ?, category = ?, price_per_day = ?, min_days = ?, max_days = ?, specs = ?, availability = ?
    `;
      const updateParams = [
        title,
        description,
        category,
        price_per_day,
        min_days,
        max_days,
        specs,
        availability || product.availability,
      ];

      if (barangay !== undefined && !isValidRoxasBarangay(barangay))
        return res
          .status(400)
          .json({ success: false, message: "Choose a valid Roxas barangay" });
      if (
        (latitude !== undefined || longitude !== undefined) &&
        !validateAndNormalizeCoordinates(latitude, longitude).valid
      )
        return res
          .status(400)
          .json({ success: false, message: "Choose valid pickup coordinates" });

      if (location !== undefined) {
        updateQuery += ", location = ?";
        updateParams.push(location ? String(location).trim() : null);
      }

      if (barangay !== undefined) {
        updateQuery += ", barangay = ?";
        updateParams.push(barangay ? String(barangay).trim() : null);
      }

      if (latitude !== undefined && longitude !== undefined) {
        const coords = validateAndNormalizeCoordinates(latitude, longitude);
        if (coords.valid) {
          if (!isWithinRoxas(coords.lat, coords.lng)) {
            return res.status(400).json({
              success: false,
              message:
                "Only locations within Roxas, Oriental Mindoro are allowed.",
            });
          }
          updateQuery += ", latitude = ?, longitude = ?";
          updateParams.push(coords.lat, coords.lng);
        }
      } else if (
        barangay !== undefined &&
        barangay &&
        String(barangay).trim()
      ) {
        // If barangay is being updated but no explicit coordinates, auto-derive from barangay
        const derived = getBarangayCoordinates(String(barangay).trim());
        if (derived) {
          updateQuery += ", latitude = ?, longitude = ?";
          updateParams.push(derived[0], derived[1]);
        }
      }
      updateQuery += " WHERE id = ?";
      updateParams.push(req.params.id);

      await db.prepare(updateQuery).run(...updateParams);

      const updated = await db
        .prepare("SELECT * FROM products WHERE id = ?")
        .get(req.params.id);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error({ route: req.originalUrl, code: error.code || error.name });
      res.status(500).json({
        success: false,
        message: "Unable to complete the request. Please try again.",
      });
    }
  },
);

router.delete(
  "/:id",
  authenticate,
  authorize("supplier", "admin"),
  async (req, res) => {
    try {
      const product = await db
        .prepare("SELECT supplier_id FROM products WHERE id = ?")
        .get(req.params.id);
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      if (req.user.role !== "admin" && product.supplier_id !== req.user.id) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      await db
        .prepare("UPDATE products SET is_active = 0 WHERE id = ?")
        .run(req.params.id);
      res.json({ success: true, message: "Product deleted" });
    } catch (error) {
      console.error({ route: req.originalUrl, code: error.code || error.name });
      res.status(500).json({
        success: false,
        message: "Unable to complete the request. Please try again.",
      });
    }
  },
);

router.post(
  "/:id/images",
  authenticate,
  authorize("supplier", "admin"),
  ownsProduct,
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "No image provided" });
      const product = await db
        .prepare("SELECT supplier_id FROM products WHERE id = ?")
        .get(req.params.id);
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      if (req.user.role !== "admin" && product.supplier_id !== req.user.id) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const imageId = uuidv4();
      const url = req.file.url;
      const isPrimary = await db.transaction(async () => {
        if (db.dialect === "postgres")
          await db
            .prepare("SELECT id FROM products WHERE id = ? FOR UPDATE")
            .get(req.params.id);
        const { c } = await db
          .prepare(
            "SELECT COUNT(*) AS c FROM product_images WHERE product_id = ?",
          )
          .get(req.params.id);
        if (c >= 5)
          throw Object.assign(new Error("Maximum 5 images per listing"), {
            status: 400,
          });
        await db
          .prepare(
            "INSERT INTO product_images (id, product_id, url, is_primary,sort_order) VALUES (?, ?, ?, ?, ?)",
          )
          .run(imageId, req.params.id, url, c === 0 ? 1 : 0, c);
        return c === 0 ? 1 : 0;
      });
      res.json({
        success: true,
        data: { id: imageId, url, is_primary: isPrimary },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id/images/order",
  authenticate,
  authorize("supplier", "admin"),
  ownsProduct,
  validate(z.object({ image_ids: z.array(z.string().uuid()).min(1).max(5) })),
  async (req, res) => {
    const ordered = await db.transaction(async () => {
      if (db.dialect === "postgres")
        await db
          .prepare("SELECT id FROM products WHERE id = ? FOR UPDATE")
          .get(req.params.id);
      const current = await db
        .prepare("SELECT id FROM product_images WHERE product_id = ?")
        .all(req.params.id);
      const ids = req.body.image_ids;
      if (
        new Set(ids).size !== ids.length ||
        ids.length !== current.length ||
        !current.every((image) => ids.includes(image.id))
      )
        return null;
      for (let i = 0; i < ids.length; i++)
        await db
          .prepare(
            "UPDATE product_images SET sort_order = ?, is_primary = ? WHERE id = ? AND product_id = ?",
          )
          .run(i, i === 0 ? 1 : 0, ids[i], req.params.id);
      return await db
        .prepare(
          "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order",
        )
        .all(req.params.id);
    });
    if (!ordered)
      return res.status(400).json({
        success: false,
        message: "Image order must contain every listing image exactly once",
      });
    res.json({ success: true, data: ordered });
  },
);

router.delete(
  "/:id/images/:imageId",
  authenticate,
  authorize("supplier", "admin"),
  async (req, res) => {
    try {
      const product = await db
        .prepare("SELECT supplier_id FROM products WHERE id = ?")
        .get(req.params.id);
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      if (req.user.role !== "admin" && product.supplier_id !== req.user.id) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
      const image = await db
        .prepare(
          "SELECT url FROM product_images WHERE id = ? AND product_id = ?",
        )
        .get(req.params.imageId, req.params.id);
      if (!image)
        return res
          .status(404)
          .json({ success: false, message: "Image not found" });
      await db
        .prepare("DELETE FROM product_images WHERE id = ? AND product_id = ?")
        .run(req.params.imageId, req.params.id);
      await require("../utils/assets").removeAsset(image.url);
      const remaining = await db
        .prepare(
          "SELECT id FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id LIMIT 1",
        )
        .get(req.params.id);
      if (remaining)
        await db
          .prepare(
            "UPDATE product_images SET is_primary = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE product_id = ?",
          )
          .run(remaining.id, req.params.id);
      res.json({ success: true, message: "Image removed" });
    } catch (error) {
      console.error({ route: req.originalUrl, code: error.code || error.name });
      res.status(500).json({
        success: false,
        message: "Unable to complete the request. Please try again.",
      });
    }
  },
);

module.exports = router;
