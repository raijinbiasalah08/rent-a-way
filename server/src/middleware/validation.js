const { z } = require("zod");
const password = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(72, "Use at most 72 characters")
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must fit within 72 UTF-8 bytes",
  );
const email = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({ success: false, message: result.error.issues[0].message });
  req.body = result.data;
  next();
};
module.exports = { z, password, email, date, validate };
