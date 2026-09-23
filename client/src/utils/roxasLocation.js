/**
 * Roxas, Oriental Mindoro, Philippines - Geolocation & Barangay Reference (Client)
 * Municipal Coordinates, Boundaries, and Official 20 Barangays.
 */

export const ROXAS_CENTER = [12.5870, 121.5190]; // Poblacion / Town Center

export const ROXAS_BOUNDS = [
  [12.4900, 121.3600], // Southwest
  [12.6800, 121.5700], // Northeast
];

export const ROXAS_BOUNDING_BOX = {
  minLat: 12.4900,
  maxLat: 12.6800,
  minLng: 121.3600,
  maxLng: 121.5700,
};

export const ROXAS_BARANGAYS = [
  { name: 'Bagumbayan', lat: 12.5830, lng: 121.5170, description: 'Poblacion area' },
  { name: 'Cantil', lat: 12.5710, lng: 121.4850, description: 'Inland agricultural barangay' },
  { name: 'Dangay', lat: 12.5950, lng: 121.5310, description: 'Port of Roxas coastal area' },
  { name: 'Happy Valley', lat: 12.5810, lng: 121.4920, description: 'Central valley barangay' },
  { name: 'Libertad', lat: 12.6050, lng: 121.5100, description: 'Northern interior' },
  { name: 'Libtong', lat: 12.5520, lng: 121.5120, description: 'Southern boundary area' },
  { name: 'Little Tanauan', lat: 12.5650, lng: 121.5230, description: 'Southeastern coastal road' },
  { name: 'Mabuhay', lat: 12.5760, lng: 121.5050, description: 'Residential district' },
  { name: 'Maraska', lat: 12.6180, lng: 121.5150, description: 'North-central area' },
  { name: 'Odiong', lat: 12.6100, lng: 121.5280, description: 'Northeastern coastal strip' },
  { name: 'Paclasan', lat: 12.5890, lng: 121.5190, description: 'Town proper and commercial district' },
  { name: 'San Aquilino', lat: 12.5967, lng: 121.4841, description: 'Western river and farming community' },
  { name: 'San Isidro', lat: 12.5680, lng: 121.4720, description: 'Southwestern upland barangay' },
  { name: 'San Jose', lat: 12.5980, lng: 121.5030, description: 'Northwestern barangay' },
  { name: 'San Mariano', lat: 12.6320, lng: 121.5080, description: 'Northern boundary area' },
  { name: 'San Miguel', lat: 12.5740, lng: 121.5300, description: 'Coastal district' },
  { name: 'San Rafael', lat: 12.5880, lng: 121.4780, description: 'Western residential community' },
  { name: 'San Vicente', lat: 12.5600, lng: 121.4950, description: 'Southern valley' },
  { name: 'Uyao', lat: 12.6250, lng: 121.4950, description: 'Northwestern foothills' },
  { name: 'Victoria', lat: 12.6220, lng: 121.5250, description: 'Northeastern highway area' },
];

export const BARANGAY_NAMES = ROXAS_BARANGAYS.map(b => b.name);

/**
 * Validates if coordinates fall within Roxas, Oriental Mindoro boundaries
 */
export function isWithinRoxas(lat, lng) {
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
export function isValidRoxasBarangay(barangay) {
  if (!barangay || typeof barangay !== 'string') return false;
  const clean = barangay.trim().toLowerCase().replace(/^brgy\.?\s*/i, '');
  return BARANGAY_NAMES.some(b => b.toLowerCase() === clean);
}

/**
 * Get canonical barangay coordinates
 */
export function getBarangayCoordinates(barangay) {
  if (!barangay) return ROXAS_CENTER;
  const clean = barangay.trim().toLowerCase().replace(/^brgy\.?\s*/i, '');
  const found = ROXAS_BARANGAYS.find(b => b.name.toLowerCase() === clean);
  return found ? [found.lat, found.lng] : ROXAS_CENTER;
}

/**
 * Format a standard Roxas address string
 */
export function formatRoxasAddress(barangay, street = '', landmark = '') {
  const b = barangay ? barangay.trim() : 'Poblacion';
  const s = street ? street.trim() : '';
  const l = landmark ? landmark.trim() : '';

  let full = s ? `${s}, Brgy. ${b}, Roxas, Oriental Mindoro` : `Brgy. ${b}, Roxas, Oriental Mindoro`;
  if (l) full += ` (${l})`;
  return full;
}
