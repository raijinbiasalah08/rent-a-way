/**
 * Roxas, Oriental Mindoro, Philippines - Geolocation & Barangay Reference
 * Municipal Coordinates, Boundaries, and Official 20 Barangays.
 */

const ROXAS_CENTER = [12.587, 121.519]; // Poblacion / Town Center

const ROXAS_BOUNDS = [
  [12.49, 121.36], // Southwest
  [12.68, 121.57], // Northeast
];

const ROXAS_BOUNDING_BOX = {
  minLat: 12.49,
  maxLat: 12.68,
  minLng: 121.36,
  maxLng: 121.57,
};

const ROXAS_BARANGAYS = [
  {
    name: "Bagumbayan",
    lat: 12.583,
    lng: 121.517,
    description: "Poblacion area",
  },
  {
    name: "Cantil",
    lat: 12.571,
    lng: 121.485,
    description: "Inland agricultural barangay",
  },
  {
    name: "Dangay",
    lat: 12.595,
    lng: 121.531,
    description: "Port of Roxas coastal area",
  },
  {
    name: "Happy Valley",
    lat: 12.581,
    lng: 121.492,
    description: "Central valley barangay",
  },
  {
    name: "Libertad",
    lat: 12.605,
    lng: 121.51,
    description: "Northern interior",
  },
  {
    name: "Libtong",
    lat: 12.552,
    lng: 121.512,
    description: "Southern boundary area",
  },
  {
    name: "Little Tanauan",
    lat: 12.565,
    lng: 121.523,
    description: "Southeastern coastal road",
  },
  {
    name: "Mabuhay",
    lat: 12.576,
    lng: 121.505,
    description: "Residential district",
  },
  {
    name: "Maraska",
    lat: 12.618,
    lng: 121.515,
    description: "North-central area",
  },
  {
    name: "Odiong",
    lat: 12.61,
    lng: 121.528,
    description: "Northeastern coastal strip",
  },
  {
    name: "Paclasan",
    lat: 12.589,
    lng: 121.519,
    description: "Town proper and commercial district",
  },
  {
    name: "San Aquilino",
    lat: 12.5967,
    lng: 121.4841,
    description: "Western river and farming community",
  },
  {
    name: "San Isidro",
    lat: 12.568,
    lng: 121.472,
    description: "Southwestern upland barangay",
  },
  {
    name: "San Jose",
    lat: 12.598,
    lng: 121.503,
    description: "Northwestern barangay",
  },
  {
    name: "San Mariano",
    lat: 12.632,
    lng: 121.508,
    description: "Northern boundary area",
  },
  {
    name: "San Miguel",
    lat: 12.574,
    lng: 121.53,
    description: "Coastal district",
  },
  {
    name: "San Rafael",
    lat: 12.588,
    lng: 121.478,
    description: "Western residential community",
  },
  {
    name: "San Vicente",
    lat: 12.56,
    lng: 121.495,
    description: "Southern valley",
  },
  {
    name: "Uyao",
    lat: 12.625,
    lng: 121.495,
    description: "Northwestern foothills",
  },
  {
    name: "Victoria",
    lat: 12.622,
    lng: 121.525,
    description: "Northeastern highway area",
  },
];

const BARANGAY_NAMES = ROXAS_BARANGAYS.map((b) => b.name);

/**
 * Validates if coordinates fall within Roxas, Oriental Mindoro boundaries
 */
function isWithinRoxas(lat, lng) {
  if (lat == null || lng == null) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return false;

  return (
    numLat >= ROXAS_BOUNDING_BOX.minLat &&
    numLat <= ROXAS_BOUNDING_BOX.maxLat &&
    numLng >= ROXAS_BOUNDING_BOX.minLng &&
    numLng <= ROXAS_BOUNDING_BOX.maxLng
  );
}

/**
 * Check if a barangay name is an official Roxas barangay
 */
function isValidRoxasBarangay(barangay) {
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
function getBarangayCoordinates(barangay) {
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
function formatRoxasAddress(barangay, street = "", landmark = "") {
  const b = barangay ? barangay.trim() : "Poblacion";
  const s = street ? street.trim() : "";
  const l = landmark ? landmark.trim() : "";

  let full = s
    ? `${s}, Brgy. ${b}, Roxas, Oriental Mindoro`
    : `Brgy. ${b}, Roxas, Oriental Mindoro`;
  if (l) full += ` (${l})`;
  return full;
}

module.exports = {
  ROXAS_CENTER,
  ROXAS_BOUNDS,
  ROXAS_BOUNDING_BOX,
  ROXAS_BARANGAYS,
  BARANGAY_NAMES,
  isWithinRoxas,
  isValidRoxasBarangay,
  getBarangayCoordinates,
  formatRoxasAddress,
};
