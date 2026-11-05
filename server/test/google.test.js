const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generateKeyPairSync } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { verifyGoogleIdToken } = require("../src/utils/googleIdentity");
test("Google verifies signatures, audience, issuer, expiry, and verified email", async (t) => {
  process.env.GOOGLE_CLIENT_ID = "test-client";
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" });
  jwk.kid = "test-key";
  t.mock.method(
    global,
    "fetch",
    async () =>
      new Response(JSON.stringify({ keys: [jwk] }), {
        headers: { "cache-control": "max-age=300" },
      }),
  );
  const claims = {
    sub: "test-identity",
    email: "Test@example.test",
    email_verified: true,
    aud: "test-client",
    iss: "https://accounts.google.com",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
  };
  const sign = (values) =>
    jwt.sign(values, privateKey, { algorithm: "RS256", keyid: "test-key" });
  assert.equal(
    (await verifyGoogleIdToken(sign(claims))).email,
    "test@example.test",
  );
  const { exp, ...noExpiry } = claims;
  for (const invalid of [
    { ...claims, aud: "someone-else" },
    { ...claims, iss: "https://attacker.test" },
    { ...claims, exp: 1 },
    noExpiry,
    { ...claims, email_verified: false },
  ])
    await assert.rejects(() => verifyGoogleIdToken(sign(invalid)));
  await assert.rejects(() =>
    verifyGoogleIdToken(
      jwt.sign(claims, "attacker-secret", { algorithm: "HS256" }),
    ),
  );
  await assert.rejects(() => verifyGoogleIdToken("not-a-token"));
});
