const jwt = require("jsonwebtoken");
const { createPublicKey } = require("node:crypto");

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let cachedGoogleKeys = null;
let googleKeysExpireAt = 0;

class GoogleIdentityError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = "GoogleIdentityError";
    this.status = status;
  }
}

async function loadGoogleKeys(forceRefresh = false) {
  if (!forceRefresh && cachedGoogleKeys && Date.now() < googleKeysExpireAt) {
    return cachedGoogleKeys;
  }

  let response;
  try {
    response = await fetch(GOOGLE_JWKS_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new GoogleIdentityError(
      "Google sign-in could not be verified right now. Please try again.",
      503,
    );
  }

  if (!response.ok) {
    throw new GoogleIdentityError(
      "Google sign-in could not be verified right now. Please try again.",
      503,
    );
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new GoogleIdentityError(
      "Google sign-in could not be verified right now. Please try again.",
      503,
    );
  }

  if (!Array.isArray(body.keys)) {
    throw new GoogleIdentityError(
      "Google sign-in could not be verified right now. Please try again.",
      503,
    );
  }

  const maxAge =
    Number(
      response.headers.get("cache-control")?.match(/max-age=(\d+)/i)?.[1],
    ) || 3600;
  cachedGoogleKeys = new Map(
    body.keys
      .filter((key) => key.kid && key.kty === "RSA")
      .map((key) => [key.kid, key]),
  );
  googleKeysExpireAt = Date.now() + Math.min(maxAge, 3600) * 1000;
  return cachedGoogleKeys;
}

async function getGoogleSigningKey(kid) {
  let keys = await loadGoogleKeys();
  if (!keys.has(kid)) keys = await loadGoogleKeys(true);

  const jwk = keys.get(kid);
  if (!jwk)
    throw new GoogleIdentityError(
      "Google credential is invalid or expired. Please try again.",
    );

  try {
    return createPublicKey({ key: jwk, format: "jwk" });
  } catch {
    throw new GoogleIdentityError(
      "Google sign-in could not be verified right now. Please try again.",
      503,
    );
  }
}

async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new GoogleIdentityError(
      "Google sign-in is not configured. Add GOOGLE_CLIENT_ID to server/.env.",
      503,
    );
  }

  if (typeof idToken !== "string" || idToken.length > 16384) {
    throw new GoogleIdentityError(
      "Google credential is missing or invalid. Please try again.",
      400,
    );
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (
    !decoded ||
    decoded.header?.alg !== "RS256" ||
    typeof decoded.header.kid !== "string"
  ) {
    throw new GoogleIdentityError(
      "Google credential is invalid or expired. Please try again.",
    );
  }

  const key = await getGoogleSigningKey(decoded.header.kid);
  let claims;
  try {
    claims = jwt.verify(idToken, key, {
      algorithms: ["RS256"],
      audience: clientId,
      issuer: ["accounts.google.com", "https://accounts.google.com"],
      clockTolerance: 5,
    });
  } catch {
    throw new GoogleIdentityError(
      "Google credential is invalid or expired. Please try again.",
    );
  }

  const issuedAt = Number(claims.iat);
  if (
    typeof claims.sub !== "string" ||
    !claims.sub ||
    claims.sub.length > 255 ||
    typeof claims.email !== "string" ||
    !claims.email ||
    claims.email.length > 320 ||
    claims.email_verified !== true ||
    (claims.azp && claims.azp !== clientId) ||
    !Number.isFinite(issuedAt) ||
    issuedAt > Math.floor(Date.now() / 1000) + 300 ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= issuedAt
  ) {
    throw new GoogleIdentityError(
      "Google account details could not be verified. Please try again.",
    );
  }

  return {
    sub: claims.sub,
    email: claims.email.trim().toLowerCase(),
    name:
      typeof claims.name === "string" ? claims.name.trim().slice(0, 120) : "",
    picture:
      typeof claims.picture === "string" &&
      claims.picture.startsWith("https://")
        ? claims.picture
        : null,
  };
}

module.exports = { GoogleIdentityError, verifyGoogleIdToken };
