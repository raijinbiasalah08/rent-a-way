const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID: uuidv4 } = require("node:crypto");
const multer = require("multer");
const db = require("../db/database");
const { authenticate } = require("../middleware/auth");
const {
  isWithinRoxas,
  isValidRoxasBarangay,
  formatRoxasAddress,
} = require("../utils/roxasLocation");
const { verifyGoogleIdToken } = require("../utils/googleIdentity");
const uploadsDir = require("../utils/uploads");

const router = express.Router();
const { z, password, email, validate } = require("../middleware/validation");
const { randomBytes, createHash } = require("node:crypto");
const { sendResetEmail } = require("../utils/email");
const { rateLimit } = require("express-rate-limit");
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});
router.use(
  ["/login", "/register", "/google", "/forgot-password", "/reset-password"],
  authLimit,
);

function runInTransaction(callback) {
  return db.transaction(callback);
}

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
  // If lat > 50 and lng < 50, swap them
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

router.post(
  "/register",
  validate(
    z.object({
      name: z.string().trim().min(2).max(100),
      email,
      password,
      role: z.enum(["customer", "renter", "supplier"]).default("customer"),
      phone: z.string().max(30).optional(),
      address: z.string().max(500).optional(),
      barangay: z.string().optional(),
      latitude: z.coerce.number().optional(),
      longitude: z.coerce.number().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const {
        name,
        email,
        password,
        phone,
        address,
        barangay,
        latitude,
        longitude,
      } = req.body;
      const role = req.body.role === "supplier" ? "supplier" : "customer";
      if (
        role === "supplier" &&
        (!isValidRoxasBarangay(barangay) || !isWithinRoxas(latitude, longitude))
      )
        return res.status(400).json({
          success: false,
          message: "Select your barangay and pickup location within Roxas.",
        });
      if (
        await db
          .prepare("SELECT id FROM users WHERE LOWER(email) = ?")
          .get(email)
      )
        return res
          .status(409)
          .json({ success: false, message: "Email already registered" });
      const id = uuidv4(),
        created_at = new Date().toISOString();
      await db
        .prepare(
          "INSERT INTO users (id,name,email,password_hash,role,phone,address,barangay,latitude,longitude,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          name,
          email,
          await bcrypt.hash(password, 12),
          role,
          phone || null,
          address || null,
          barangay || null,
          latitude ?? null,
          longitude ?? null,
          created_at,
        );
      const token = jwt.sign({ id, role, version: 0 }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      });
      res.status(201).json({
        success: true,
        data: {
          user: {
            id,
            name,
            email,
            role,
            phone,
            address,
            barangay,
            latitude,
            longitude,
            created_at,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/login",
  validate(z.object({ email, password: z.string().min(1).max(200) })),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ success: false, message: "Email and password are required" });
      }

      const user = await db
        .prepare("SELECT * FROM users WHERE LOWER(email) = ?")
        .get(email);
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
      }

      if (!user.is_active) {
        return res
          .status(403)
          .json({ success: false, message: "Account is deactivated" });
      }

      const { password_hash, ...userWithoutPassword } = user;
      const token = jwt.sign(
        { id: user.id, role: user.role, version: user.token_version },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
      );

      res.json({ success: true, data: { user: userWithoutPassword, token } });
    } catch (error) {
      console.error({ route: req.originalUrl, code: error.code || error.name });
      res.status(500).json({
        success: false,
        message: "Unable to complete the request. Please try again.",
      });
    }
  },
);

router.get("/google/config", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({
      success: false,
      message:
        "Google sign-in is not configured. Add GOOGLE_CLIENT_ID to server/.env.",
    });
  }
  res.json({ success: true, data: { clientId } });
});

router.post("/google", async (req, res) => {
  let profile;
  try {
    profile = await verifyGoogleIdToken(req.body?.credential);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Google sign-in could not be verified.",
    });
  }

  const requestedRole = req.body?.role;
  const createdAt = new Date().toISOString();

  try {
    const result = await runInTransaction(async () => {
      const linkedIdentity = await db
        .prepare("SELECT user_id FROM google_identities WHERE google_sub = ?")
        .get(profile.sub);
      let user = linkedIdentity
        ? await db
            .prepare("SELECT * FROM users WHERE id = ?")
            .get(linkedIdentity.user_id)
        : await db
            .prepare("SELECT * FROM users WHERE LOWER(email) = ?")
            .get(profile.email);

      if (user) {
        if (!user.is_active) return { inactive: true };

        const existingLink = await db
          .prepare("SELECT user_id FROM google_identities WHERE google_sub = ?")
          .get(profile.sub);
        if (existingLink && existingLink.user_id !== user.id)
          return { identityConflict: true };
        if (!existingLink) {
          await db
            .prepare(
              "INSERT INTO google_identities (google_sub, user_id, created_at) VALUES (?, ?, ?)",
            )
            .run(profile.sub, user.id, createdAt);
        }

        if (!user.avatar && profile.picture) {
          await db
            .prepare("UPDATE users SET avatar = ? WHERE id = ?")
            .run(profile.picture, user.id);
          user.avatar = profile.picture;
        }
        return { user };
      }

      if (!requestedRole) return { needsRoleSelection: true };
      if (!["customer", "renter", "supplier"].includes(requestedRole))
        return { invalidRole: true };

      const role = requestedRole === "supplier" ? "supplier" : "customer";
      const id = uuidv4();
      const name = profile.name || profile.email.split("@")[0];
      const passwordHash = bcrypt.hashSync(`${uuidv4()}${Date.now()}`, 10);
      const defaultBarangay = null;
      const defaultAddress = null;

      await db
        .prepare(
          `
        INSERT INTO users (id, name, email, password_hash, role, avatar, address, barangay, latitude, longitude, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          id,
          name,
          profile.email,
          passwordHash,
          role,
          profile.picture,
          defaultAddress,
          defaultBarangay,
          null,
          null,
          createdAt,
        );

      await db
        .prepare(
          "INSERT INTO google_identities (google_sub, user_id, created_at) VALUES (?, ?, ?)",
        )
        .run(profile.sub, id, createdAt);
      return {
        user: await db.prepare("SELECT * FROM users WHERE id = ?").get(id),
      };
    });

    if (result.needsRoleSelection) {
      return res.json({
        success: true,
        data: {
          needsRoleSelection: true,
          googleUser: {
            sub: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
          },
        },
      });
    }
    if (result.inactive) {
      return res
        .status(403)
        .json({ success: false, message: "Account is deactivated" });
    }
    if (result.identityConflict) {
      return res.status(409).json({
        success: false,
        message: "This Google account is linked to another Rent-A-Way account.",
      });
    }
    if (result.invalidRole) {
      return res.status(400).json({
        success: false,
        message: "Choose either the renter or supplier role.",
      });
    }

    const { password_hash, ...userWithoutPassword } = result.user;
    const token = jwt.sign(
      {
        id: result.user.id,
        role: result.user.role,
        version: result.user.token_version,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );
    res.json({ success: true, data: { user: userWithoutPassword, token } });
  } catch (error) {
    console.error({
      event: "google_sign_in_failed",
      code: error.code || error.name,
    });
    res.status(500).json({
      success: false,
      message: "Could not finish Google sign-in. Please try again.",
    });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await db
      .prepare(
        "SELECT id, name, email, role, phone, address, barangay, latitude, longitude, avatar, is_active, created_at FROM users WHERE id = ?",
      )
      .get(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error({ route: req.originalUrl, code: error.code || error.name });
    res.status(500).json({
      success: false,
      message: "Unable to complete the request. Please try again.",
    });
  }
});

router.put(
  "/profile",
  authenticate,
  validate(
    z.object({
      name: z.string().trim().min(2).max(100),
      phone: z.string().max(30).optional(),
      address: z.string().max(500).optional(),
      barangay: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    }),
  ),
  async (req, res) => {
    try {
      const { name, phone, address, barangay, latitude, longitude } = req.body;
      const coords = validateAndNormalizeCoordinates(latitude, longitude);
      if (barangay && !isValidRoxasBarangay(barangay))
        return res
          .status(400)
          .json({ success: false, message: "Choose a valid Roxas barangay" });
      if ((latitude != null || longitude != null) && !coords.valid)
        return res.status(400).json({
          success: false,
          message: "Choose valid location coordinates",
        });

      if (coords.valid && !isWithinRoxas(coords.lat, coords.lng)) {
        return res.status(400).json({
          success: false,
          message: "Only locations within Roxas, Oriental Mindoro are allowed.",
        });
      }

      let updateQuery = "UPDATE users SET name = ?, phone = ?, address = ?";
      const updateParams = [
        name ? String(name).trim() : null,
        phone ? String(phone).trim() : null,
        address ? String(address).trim() : null,
      ];

      if (barangay !== undefined) {
        updateQuery += ", barangay = ?";
        updateParams.push(barangay ? String(barangay).trim() : null);
      }

      if (latitude !== undefined && longitude !== undefined) {
        updateQuery += ", latitude = ?, longitude = ?";
        updateParams.push(
          coords.valid ? coords.lat : null,
          coords.valid ? coords.lng : null,
        );
      }

      updateQuery += " WHERE id = ?";
      updateParams.push(req.user.id);

      await db.prepare(updateQuery).run(...updateParams);

      // Cascading update: If supplier updates location, auto-update all their equipment listings
      const currentUser = await db
        .prepare(
          "SELECT role, barangay, address, latitude, longitude FROM users WHERE id = ?",
        )
        .get(req.user.id);
      if (
        currentUser?.role === "supplier" &&
        coords.valid &&
        isWithinRoxas(coords.lat, coords.lng)
      ) {
        await db
          .prepare(
            `
        UPDATE products 
        SET location = ?, barangay = ?, latitude = ?, longitude = ? 
        WHERE supplier_id = ? AND is_active = 1
      `,
          )
          .run(
            address ? address.trim() : currentUser.address || "",
            barangay ? barangay.trim() : currentUser.barangay || "Poblacion",
            coords.lat,
            coords.lng,
            req.user.id,
          );
      }

      const user = await db
        .prepare(
          "SELECT id, name, email, role, phone, address, barangay, latitude, longitude, avatar, is_active, created_at FROM users WHERE id = ?",
        )
        .get(req.user.id);
      res.json({ success: true, data: user });
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
  "/profile/avatar",
  authenticate,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No image provided" });
      }
      const avatarUrl = req.file.url;
      const previous = await db
        .prepare("SELECT avatar FROM users WHERE id = ?")
        .get(req.user.id);
      await db
        .prepare("UPDATE users SET avatar = ? WHERE id = ?")
        .run(avatarUrl, req.user.id);
      await require("../utils/assets").removeAsset(previous?.avatar);
      const user = await db
        .prepare(
          "SELECT id, name, email, role, phone, address, avatar, is_active, created_at FROM users WHERE id = ?",
        )
        .get(req.user.id);
      res.json({ success: true, data: user });
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
  "/password",
  authenticate,
  validate(
    z.object({ currentPassword: z.string().min(1), newPassword: password }),
  ),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await db
        .prepare("SELECT password_hash FROM users WHERE id = ?")
        .get(req.user.id);
      if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
        return res
          .status(400)
          .json({ success: false, message: "Incorrect current password" });
      }
      const hash = await bcrypt.hash(newPassword, 10);
      await db
        .prepare(
          "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
        )
        .run(hash, req.user.id);
      require("../socket").disconnectUser(req.user.id);
      res.json({ success: true, message: "Password updated successfully" });
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
  "/forgot-password",
  validate(z.object({ email })),
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await db
        .prepare(
          "SELECT id FROM users WHERE LOWER(email) = ? AND is_active = 1",
        )
        .get(email);
      if (user) {
        const token = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        await db
          .prepare(
            "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
          )
          .run(
            tokenHash,
            user.id,
            new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          );
        try {
          await sendResetEmail(
            email,
            `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${token}`,
          );
        } catch {
          await db
            .prepare("DELETE FROM password_resets WHERE token_hash = ?")
            .run(tokenHash);
          console.error("Password reset delivery failed");
        }
      }
      res.json({
        success: true,
        message:
          "If an account exists, a reset link will be sent to its email address.",
      });
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
  "/reset-password",
  validate(z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password })),
  async (req, res) => {
    try {
      const tokenHash = createHash("sha256")
        .update(req.body.token)
        .digest("hex");
      const hash = await bcrypt.hash(req.body.password, 12);
      const changed = await runInTransaction(async () => {
        const reset = await db
          .prepare(
            "DELETE FROM password_resets WHERE token_hash = ? AND expires_at > ? RETURNING user_id",
          )
          .get(tokenHash, new Date().toISOString());
        if (!reset) return false;
        await db
          .prepare(
            "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
          )
          .run(hash, reset.user_id);
        await db
          .prepare("DELETE FROM password_resets WHERE user_id = ?")
          .run(reset.user_id);
        return reset.user_id;
      });
      if (!changed)
        return res.status(400).json({
          success: false,
          message: "This reset link has expired or has already been used.",
        });
      require("../socket").disconnectUser(changed);
      res.json({
        success: true,
        message: "Password updated. Please sign in again.",
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Unable to reset password" });
    }
  },
);

router.get("/user/:id", authenticate, async (req, res) => {
  const user = await db
    .prepare(
      "SELECT id, name, avatar, role FROM users WHERE id = ? AND is_active = 1",
    )
    .get(req.params.id);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, data: user });
});

module.exports = router;
