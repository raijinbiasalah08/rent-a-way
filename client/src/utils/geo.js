/**
 * Haversine formula to calculate the great-circle distance between two points
 * on the Earth given their latitudes and longitudes in decimal degrees.
 * 
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number|null} Distance in kilometers, or null if coordinates invalid
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371; // Earth's radius in km
  const dLat = (numLat2 - numLat1) * (Math.PI / 180);
  const dLon = (numLon2 - numLon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(numLat1 * (Math.PI / 180)) *
      Math.cos(numLat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance in kilometers into a human-friendly string (e.g. "450 m away" or "2.4 km away").
 * 
 * @param {number|null} distanceKm Distance in kilometers
 * @returns {string|null}
 */
export function formatDistance(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm)) return null;
  if (distanceKm < 1) {
    const meters = Math.max(10, Math.round(distanceKm * 1000));
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Convenience helper to compute and format distance from a customer location tuple [lat, lng].
 * 
 * @param {[number, number]|null} customerCoords [lat, lng] of customer
 * @param {number|null} targetLat Latitude of item
 * @param {number|null} targetLng Longitude of item
 * @returns {string|null}
 */
export function getDistanceText(customerCoords, targetLat, targetLng) {
  if (!customerCoords || !customerCoords[0] || !customerCoords[1]) return null;
  const dist = calculateDistance(customerCoords[0], customerCoords[1], targetLat, targetLng);
  return formatDistance(dist);
}
