import boundary from "./roxasBoundary.json";

/**
 * Roxas, Oriental Mindoro, Philippines - Geolocation & Barangay Reference (Client)
 * Municipal Coordinates, Boundaries, and Official 20 Barangays.
 */

export const ROXAS_CENTER = [12.587, 121.519]; // Poblacion / Town Center

// NAMRIA/PSA municipal polygon, PSGC 1705212000, via faeldon/philippines-json-maps.
const ring = boundary.coordinates[0];
const latitudes = ring.map(([, lat]) => lat);
const longitudes = ring.map(([lng]) => lng);
export const ROXAS_BOUNDING_BOX = {
  minLat: Math.min(...latitudes),
  maxLat: Math.max(...latitudes),
  minLng: Math.min(...longitudes),
  maxLng: Math.max(...longitudes),
};

export const ROXAS_BOUNDS = [
  [ROXAS_BOUNDING_BOX.minLat, ROXAS_BOUNDING_BOX.minLng],
  [ROXAS_BOUNDING_BOX.maxLat, ROXAS_BOUNDING_BOX.maxLng],
];

export const ROXAS_BARANGAYS = [
  {
    name: "Bagumbayan",
    lat: 12.59596,
    lng: 121.516301,
    description: "Poblacion area",
  },
  {
    name: "Cantil",
    lat: 12.617897,
    lng: 121.51056,
    description: "Inland agricultural barangay",
  },
  {
    name: "Dangay",
    lat: 12.600066,
    lng: 121.525121,
    description: "Port of Roxas coastal area",
  },
  {
    name: "Happy Valley",
    lat: 12.641037,
    lng: 121.415588,
    description: "Central valley barangay",
  },
  {
    name: "Libertad",
    lat: 12.614996,
    lng: 121.47285,
    description: "Northern interior",
  },
  {
    name: "Libtong",
    lat: 12.630894,
    lng: 121.486714,
    description: "Southern boundary area",
  },
  {
    name: "Little Tanauan",
    lat: 12.623879,
    lng: 121.459986,
    description: "Southeastern coastal road",
  },
  {
    name: "Mabuhay",
    lat: 12.639794,
    lng: 121.464269,
    description: "Residential district",
  },
  {
    name: "Maraska",
    lat: 12.648249,
    lng: 121.445575,
    description: "North-central area",
  },
  {
    name: "Odiong",
    lat: 12.597835,
    lng: 121.499745,
    description: "Northeastern coastal strip",
  },
  {
    name: "Paclasan",
    lat: 12.584192,
    lng: 121.515018,
    description: "Town proper and commercial district",
  },
  {
    name: "San Aquilino",
    lat: 12.589407,
    lng: 121.485282,
    description: "Western river and farming community",
  },
  {
    name: "San Isidro",
    lat: 12.576352,
    lng: 121.505973,
    description: "Southwestern upland barangay",
  },
  {
    name: "San Jose",
    lat: 12.60908,
    lng: 121.540473,
    description: "Northwestern barangay",
  },
  {
    name: "San Mariano",
    lat: 12.63822,
    lng: 121.436413,
    description: "Northern boundary area",
  },
  {
    name: "San Miguel",
    lat: 12.606211,
    lng: 121.47195,
    description: "Coastal district",
  },
  {
    name: "San Rafael",
    lat: 12.658151,
    lng: 121.412718,
    description: "Western residential community",
  },
  {
    name: "San Vicente",
    lat: 12.627283,
    lng: 121.385871,
    description: "Southern valley",
  },
  {
    name: "Uyao",
    lat: 12.625288,
    lng: 121.474517,
    description: "Northwestern foothills",
  },
  {
    name: "Victoria",
    lat: 12.611344,
    lng: 121.487389,
    description: "Northeastern highway area",
  },
];

export const BARANGAY_NAMES = ROXAS_BARANGAYS.map((b) => b.name);

/**
 * Validates if coordinates fall within Roxas, Oriental Mindoro boundaries
 */
export function isWithinRoxas(lat, lng) {
  if (lat == null || lng == null) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) return false;

  let inside = false;
  for (let i = 1; i < ring.length; i++) {
    const [x1, y1] = ring[i - 1];
    const [x2, y2] = ring[i];
    if ((y1 > numLat) !== (y2 > numLat) &&
        numLng < x1 + (x2 - x1) * (numLat - y1) / (y2 - y1)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Check if a barangay name is an official Roxas barangay
 */
export function isValidRoxasBarangay(barangay) {
  if (!barangay || typeof barangay !== "string") return false;
  const clean = barangay
    .trim()
    .toLowerCase()
    .replace(/^brgy\.?\s*/i, "");
  return BARANGAY_NAMES.some((b) => b.toLowerCase() === clean);
}

/**
 * Get canonical barangay coordinates
 */
export function getBarangayCoordinates(barangay) {
  if (!barangay) return ROXAS_CENTER;
  const clean = barangay
    .trim()
    .toLowerCase()
    .replace(/^brgy\.?\s*/i, "");
  const found = ROXAS_BARANGAYS.find((b) => b.name.toLowerCase() === clean);
  return found ? [found.lat, found.lng] : ROXAS_CENTER;
}

/**
 * Format a standard Roxas address string
 */
export function formatRoxasAddress(barangay, street = "", landmark = "") {
  const b = barangay ? barangay.trim() : "Poblacion";
  const s = street ? street.trim() : "";
  const l = landmark ? landmark.trim() : "";

  let full = s
    ? `${s}, Brgy. ${b}, Roxas, Oriental Mindoro`
    : `Brgy. ${b}, Roxas, Oriental Mindoro`;
  if (l) full += ` (${l})`;
  return full;
}
