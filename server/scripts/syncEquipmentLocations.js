/**
 * syncEquipmentLocations.js
 * One-time migration: backfill lat/lng for products that have a barangay but missing coords.
 * Uses Node.js built-in node:sqlite (Node 22+)
 * Usage: node server/scripts/syncEquipmentLocations.js
 */

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const ROXAS_CENTER = [12.5870, 121.5190];

const ROXAS_BARANGAYS = [
  { name: 'Bagumbayan',    lat: 12.5830, lng: 121.5170 },
  { name: 'Cantil',        lat: 12.5710, lng: 121.4850 },
  { name: 'Dangay',        lat: 12.5950, lng: 121.5310 },
  { name: 'Happy Valley',  lat: 12.5810, lng: 121.4920 },
  { name: 'Libertad',      lat: 12.6050, lng: 121.5100 },
  { name: 'Libtong',       lat: 12.5520, lng: 121.5120 },
  { name: 'Little Tanauan',lat: 12.5650, lng: 121.5230 },
  { name: 'Mabuhay',       lat: 12.5760, lng: 121.5050 },
  { name: 'Maraska',       lat: 12.6180, lng: 121.5150 },
  { name: 'Odiong',        lat: 12.6100, lng: 121.5280 },
  { name: 'Paclasan',      lat: 12.5890, lng: 121.5190 },
  { name: 'San Aquilino',  lat: 12.5967, lng: 121.4841 },
  { name: 'San Isidro',    lat: 12.5680, lng: 121.4720 },
  { name: 'San Jose',      lat: 12.5980, lng: 121.5030 },
  { name: 'San Mariano',   lat: 12.6320, lng: 121.5080 },
  { name: 'San Miguel',    lat: 12.5740, lng: 121.5300 },
  { name: 'San Rafael',    lat: 12.5880, lng: 121.4780 },
  { name: 'San Vicente',   lat: 12.5600, lng: 121.4950 },
  { name: 'Uyao',          lat: 12.6250, lng: 121.4950 },
  { name: 'Victoria',      lat: 12.6220, lng: 121.5250 },
];

function getBarangayCoordinates(barangay) {
  if (!barangay) return ROXAS_CENTER;
  const clean = barangay.trim().toLowerCase().replace(/^brgy\.?\s*/i, '');
  const found = ROXAS_BARANGAYS.find(b => b.name.toLowerCase() === clean);
  return found ? [found.lat, found.lng] : ROXAS_CENTER;
}

function isWithinRoxas(lat, lng) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return false;
  return numLat >= 12.4900 && numLat <= 12.6800 && numLng >= 121.3600 && numLng <= 121.5700;
}

const DB_PATH = path.join(__dirname, '../rentaway.db');
if (!fs.existsSync(DB_PATH)) {
  console.error('DB not found at:', DB_PATH);
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
console.log('Connected to:', DB_PATH);

const products = db.prepare('SELECT id, title, barangay, latitude, longitude FROM products WHERE is_active = 1').all();
console.log('Active products:', products.length);

let updated = 0, alreadyOk = 0, noBarangay = 0;

for (const p of products) {
  if (p.latitude != null && p.longitude != null && isWithinRoxas(p.latitude, p.longitude)) {
    alreadyOk++;
    continue;
  }
  if (!p.barangay || !p.barangay.trim()) {
    noBarangay++;
    console.log('  No barangay:', p.title);
    continue;
  }
  const [lat, lng] = getBarangayCoordinates(p.barangay);
  db.prepare('UPDATE products SET latitude = ?, longitude = ? WHERE id = ?').run(lat, lng, p.id);
  console.log('  Synced:', p.title, '->', p.barangay, '(' + lat + ', ' + lng + ')');
  updated++;
}

console.log('\nDone.');
console.log('  Updated with barangay coords:', updated);
console.log('  Already had valid coords:    ', alreadyOk);
console.log('  Missing barangay (skipped):  ', noBarangay);
