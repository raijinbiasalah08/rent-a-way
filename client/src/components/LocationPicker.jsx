import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, LocateFixed, Search, CheckCircle2, AlertCircle, Loader2, Compass } from 'lucide-react';
import {
  ROXAS_CENTER,
  ROXAS_BOUNDS,
  ROXAS_BARANGAYS,
  isWithinRoxas,
  getBarangayCoordinates,
  formatRoxasAddress
} from '../utils/roxasLocation';
import api from '../api/axios';
import toast from 'react-hot-toast';

// Fix Leaflet's default icon path in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom pinpoint marker icon
const listerPinIcon = L.icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [28, 44],
  iconAnchor: [14, 44],
  popupAnchor: [1, -38]
});

// Helper component to handle map clicks
function MapClickSetter({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Helper component to smoothly center/fly map when coordinates change
function MapCenterController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

export default function LocationPicker({
  location = '',
  barangay = '',
  street = '',
  landmark = '',
  latitude = null,
  longitude = null,
  onChange,
  required = false,
  error = ''
}) {
  // Validate incoming coords or default to Roxas Town Center (Poblacion)
  const hasValidInputCoords = latitude != null && longitude != null && isWithinRoxas(latitude, longitude);

  const initialLat = hasValidInputCoords ? Number(latitude) : ROXAS_CENTER[0];
  const initialLng = hasValidInputCoords ? Number(longitude) : ROXAS_CENTER[1];

  // Default to the first available barangay (Bagumbayan) if none provided
  const initialBarangay = barangay || (location && location.includes('San Aquilino') ? 'San Aquilino' : ROXAS_BARANGAYS[0].name);

  const [selectedBarangay, setSelectedBarangay] = useState(initialBarangay);
  const [streetInput, setStreetInput] = useState(street || '');
  const [landmarkInput, setLandmarkInput] = useState(landmark || '');
  const [coords, setCoords] = useState([initialLat, initialLng]);
  const [hasCustomCoords, setHasCustomCoords] = useState(hasValidInputCoords);
  const [boundaryError, setBoundaryError] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  const markerRef = useRef(null);

  // Synchronize internal state if props change from outside
  useEffect(() => {
    if (barangay && barangay !== selectedBarangay) {
      setSelectedBarangay(barangay);
    }
    if (latitude && longitude && isWithinRoxas(latitude, longitude)) {
      setCoords([Number(latitude), Number(longitude)]);
      setHasCustomCoords(true);
    }
  }, [barangay, latitude, longitude]);

  // Handle marker drag
  const markerEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latlng = marker.getLatLng();
          handleUpdatePosition(latlng.lat, latlng.lng);
        }
      },
    }),
    [selectedBarangay, streetInput, landmarkInput]
  );

  // Validate and update coordinates strictly within Roxas
  const handleUpdatePosition = (lat, lng) => {
    if (!isWithinRoxas(lat, lng)) {
      const err = 'Only locations within Roxas, Oriental Mindoro are allowed.';
      setBoundaryError(err);
      toast.error(err);
      // Snap marker back to current valid coords
      const bCoords = getBarangayCoordinates(selectedBarangay);
      setCoords(bCoords);
      return;
    }

    setBoundaryError('');
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    setCoords([roundedLat, roundedLng]);
    setHasCustomCoords(true);

    notifyChange(selectedBarangay, streetInput, landmarkInput, roundedLat, roundedLng);
  };

  // When Barangay selection changes
  const handleBarangayChange = (newBarangay) => {
    setSelectedBarangay(newBarangay);
    setBoundaryError('');

    // Center map on the selected Barangay
    const newCoords = getBarangayCoordinates(newBarangay);
    setCoords(newCoords);
    setHasCustomCoords(true);

    notifyChange(newBarangay, streetInput, landmarkInput, newCoords[0], newCoords[1]);
  };

  const handleStreetChange = (newStreet) => {
    setStreetInput(newStreet);
    notifyChange(selectedBarangay, newStreet, landmarkInput, coords[0], coords[1]);
  };

  const handleLandmarkChange = (newLandmark) => {
    setLandmarkInput(newLandmark);
    notifyChange(selectedBarangay, streetInput, newLandmark, coords[0], coords[1]);
  };

  const notifyChange = (b, s, l, lat, lng) => {
    const fullAddress = formatRoxasAddress(b, s, l);
    onChange?.({
      barangay: b,
      street: s,
      landmark: l,
      location: fullAddress,
      latitude: lat,
      longitude: lng
    });
  };

  // Device GPS Location Handler (Restricted to Roxas)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser');
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: gpsLat, longitude: gpsLng } = pos.coords;
        setLocating(false);

        if (!isWithinRoxas(gpsLat, gpsLng)) {
          const err = 'Only locations within Roxas, Oriental Mindoro are allowed.';
          setBoundaryError(err);
          toast.error(
            'Your current device GPS is outside Roxas, Oriental Mindoro. Please pick a Barangay and Purok on the map.'
          );
          return;
        }

        setBoundaryError('');
        const roundedLat = parseFloat(gpsLat.toFixed(6));
        const roundedLng = parseFloat(gpsLng.toFixed(6));
        setCoords([roundedLat, roundedLng]);
        setHasCustomCoords(true);
        toast.success('Roxas GPS coordinates captured!');
        notifyChange(selectedBarangay, streetInput, landmarkInput, roundedLat, roundedLng);
      },
      (err) => {
        setLocating(false);
        console.warn('GPS location error:', err);
        toast.error('Unable to get GPS position. Please choose your Barangay from the dropdown.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-red-500" />
            <span>Pickup &amp; Lister Location</span>
            {required && <span className="text-red-500">*</span>}
          </label>
          <p className="text-xs text-gray-500">
            Restricted to <strong className="text-gray-700">Roxas, Oriental Mindoro</strong> only
          </p>
        </div>
        <span className="text-[11px] bg-blue-50 text-[#1e3a8a] border border-blue-100 font-semibold px-2 py-0.5 rounded-full">
          Roxas Municipal Map
        </span>
      </div>

      {/* ── BARANGAY-BASED ADDRESS SYSTEM ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        
        {/* 1. Barangay Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Barangay <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedBarangay}
            onChange={(e) => handleBarangayChange(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 font-medium outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition shadow-2xs cursor-pointer"
          >
            {ROXAS_BARANGAYS.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Street / Purok / Sitio */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Street / Purok / Sitio <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={streetInput}
            onChange={(e) => handleStreetChange(e.target.value)}
            placeholder="e.g. Purok 3 or Rizal St."
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition shadow-2xs"
          />
        </div>

        {/* 3. Landmark */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Landmark <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={landmarkInput}
            onChange={(e) => handleLandmarkChange(e.target.value)}
            placeholder="e.g. Near Barangay Hall"
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition shadow-2xs"
          />
        </div>

      </div>

      {/* Generated Address String Preview */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex items-center justify-between text-xs text-gray-700">
        <div className="flex items-center gap-2 truncate">
          <Compass className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="truncate">
            <strong>Address:</strong> {formatRoxasAddress(selectedBarangay, streetInput, landmarkInput)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          title="Verify your current location with device GPS"
          className="flex items-center gap-1 text-[11px] font-semibold text-[#1e3a8a] hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 transition whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
          <span>{locating ? 'Checking…' : 'GPS Check'}</span>
        </button>
      </div>

      {/* Boundary Error Alert */}
      {(boundaryError || error) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-700 flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{boundaryError || error}</span>
        </div>
      )}

      {/* Interactive Roxas Map Picker */}
      <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner z-0">
        <MapContainer
          center={coords}
          zoom={14}
          minZoom={12}
          maxBounds={ROXAS_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={false}
          className="h-full w-full"
          style={{ height: '100%', width: '100%', zIndex: 1 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapCenterController center={coords} />
          <MapClickSetter onClick={handleUpdatePosition} />
          <Marker
            position={coords}
            draggable={true}
            eventHandlers={markerEventHandlers}
            ref={markerRef}
            icon={listerPinIcon}
          >
            <Popup>
              <div className="p-1 text-xs font-sans">
                <p className="font-bold text-gray-900 mb-0.5">Brgy. {selectedBarangay}</p>
                <p className="text-gray-600 leading-tight mb-1 text-[11px]">
                  {formatRoxasAddress(selectedBarangay, streetInput, landmarkInput)}
                </p>
                <p className="text-[10px] text-gray-400">Drag pin to set exact doorstep inside Roxas</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Floating Hint and Coordinates Readout */}
        <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-xs border border-gray-200 px-2.5 py-1 rounded-lg text-[11px] text-gray-700 shadow-xs flex items-center gap-1.5 pointer-events-none">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            Roxas Pin: <strong className="font-mono">{coords[0].toFixed(5)}, {coords[1].toFixed(5)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
