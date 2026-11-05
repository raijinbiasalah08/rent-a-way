const configuredApiOrigin =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_ORIGIN = configuredApiOrigin.replace(/\/+$/, "");
export const API_BASE_URL = `${API_ORIGIN}/api`;

export function apiAssetUrl(resource) {
  if (typeof resource !== "string" || !resource) return "";
  if (/^https?:\/\//i.test(resource)) return resource;
  return `${API_ORIGIN}${resource.startsWith("/") ? "" : "/"}${resource}`;
}
