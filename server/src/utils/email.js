const fs = require("node:fs/promises");
const path = require("node:path");
async function sendResetEmail(email, url) {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Password reset email is not configured");
    // Explicit local-only outbox; never expose the reset URL in an API response or shared logs.
    const outbox = path.resolve(process.env.MAIL_OUTBOX || ".local-mail");
    await fs.mkdir(outbox, { recursive: true });
    await fs.writeFile(
      path.join(outbox, `${require("node:crypto").randomUUID()}.json`),
      JSON.stringify({ to: email, url }),
      { mode: 0o600 },
    );
    return;
  }
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [email],
      subject: "Reset your Rent-A-Way password",
      text: `Use this link within 30 minutes to reset your password: ${url}\nIf you did not request this, ignore this email.`,
    }),
  });
  if (!result.ok) throw new Error("Reset email delivery failed");
}
module.exports = { sendResetEmail };
