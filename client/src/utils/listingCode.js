export function getListingCode(product) {
  const explicitCode = product?.listing_code || product?.product_code || product?.code;
  if (explicitCode) {
    const normalizedCode = String(explicitCode).trim().toUpperCase();
    if (normalizedCode.startsWith("RW-")) return normalizedCode;
    const compactExplicitCode = normalizedCode.replace(/[^A-Z0-9]/g, "");
    if (compactExplicitCode) return `RW-${compactExplicitCode}`;
  }

  const compactCode = String(product?.id || "").replace(/[^a-zA-Z0-9]/g, "");
  if (!compactCode) return "RW-LISTING";

  return `RW-${compactCode.slice(0, 8).toUpperCase()}`;
}
