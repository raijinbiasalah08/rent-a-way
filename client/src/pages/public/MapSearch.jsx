import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Filter, Star, Navigation, MapPin, LocateFixed, ArrowRight,
  Search, AlertCircle, Bug, ChevronDown, ChevronUp, CheckCircle2,
  Crosshair, Loader2, X, Compass
} from 'lucide-react';
import { getProducts } from '../../api/products';
import { useCustomerLocation } from '../../context/CustomerLocationContext';
import { calculateDistance, formatDistance } from '../../utils/geo';
import {
  ROXAS_CENTER,
  ROXAS_BOUNDS,
  ROXAS_BARANGAYS,
  isWithinRoxas,
  getBarangayCoordinates,
  formatRoxasAddress
} from '../../utils/roxasLocation';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

// Fix Leaflet default marker icons in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BASE_URL = 'http://localhost:5000';

const CATEGORIES = [
  { id: '', label: 'All Equipment' },
  { id: 'Cameras', label: '📷 Cameras & Drones' },
  { id: 'Camping', label: '⛺ Camping' },
  { id: 'Sports', label: '🏄 Sports' },
  { id: 'Event', label: '🎉 Event' },
  { id: 'Household', label: '🔧 Household' },
  { id: 'School', label: '🔬 School Projects' },
];

const RADIUS_OPTIONS = [
  { label: 'All', value: null },
  { label: '500 m', value: 0.5 },
  { label: '1 km', value: 1 },
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '15 km', value: 15 },
];

// Custom User Location Pulsing Icon
const userBeaconIcon = L.divIcon({
  className: 'user-beacon-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
      <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: rgba(30, 58, 138, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 16px; height: 16px; border-radius: 50%; background-color: #1e3a8a; border: 3px solid #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.35); z-index: 10;"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// Custom Highlighted Item Icon
const highlightedItemIcon = L.icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [32, 50],
  iconAnchor: [16, 50],
  popupAnchor: [1, -42]
});

// Helper component to handle map instance and smooth fly-to
function MapController({ flyTarget, onBoundsChange }) {
  const map = useMap();

  useEffect(() => {
    if (flyTarget && flyTarget.coords && flyTarget.coords[0] && flyTarget.coords[1]) {
      map.flyTo(flyTarget.coords, flyTarget.zoom || 14, { duration: 1.4 });
    }
  }, [flyTarget, map]);

  useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
        centerLat: map.getCenter().lat,
        centerLng: map.getCenter().lng
      });
    }
  });

  return null;
}

// Helper to capture clicks on the map when manual pinning mode is active
function MapClickHandler({ active, onSelectLocation }) {
  useMapEvents({
    click(e) {
      if (active) {
        onSelectLocation(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export default function MapSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const barangayParam = searchParams.get('barangay') || '';

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedBarangay, setSelectedBarangay] = useState(barangayParam);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bounds, setBounds] = useState(null);

  // Geolocation & Radius state
  const { customerCoords, getItemDistance, setCustomerCoords, requestCustomerLocation, selectBarangay } = useCustomerLocation();
  const [userLocation, setUserLocation] = useState(customerCoords || ROXAS_CENTER);
  const [isGpsSource, setIsGpsSource] = useState(false);
  const [locating, setLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(null); // in km
  const [flyTarget, setFlyTarget] = useState(null);

  // Manual Location Selection Fallback state
  const [showManualBar, setShowManualBar] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [searchingManual, setSearchingManual] = useState(false);
  const [isManualPinMode, setIsManualPinMode] = useState(false);

  // Card & Marker synchronization
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const cardRefs = useRef({});

  // Developer Debug Inspector State (hidden by default in production)
  const [showDebugInspector, setShowDebugInspector] = useState(false);
  const [isInspectorMinimized, setIsInspectorMinimized] = useState(false);

  // Default center: Roxas Poblacion, Oriental Mindoro
  const defaultCenter = ROXAS_CENTER;

  // Auto-prompt GPS on initial mount with enableHighAccuracy: true
  useEffect(() => {
    if (customerCoords) {
      setUserLocation(customerCoords);
      setFlyTarget({ coords: customerCoords, zoom: 14 });
    } else {
      // Prompt user for high-accuracy browser geolocation
      requestCustomerLocation(true)
        .then((coords) => {
          setUserLocation(coords);
          setIsGpsSource(true);
          setFlyTarget({ coords, zoom: 14 });
        })
        .catch((err) => {
          console.warn('Geolocation auto-prompt error or dismissed:', err.message);
          setPermissionDenied(true);
        });
    }
  }, []);

  // Sync category param with URL
  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    const newParams = new URLSearchParams(searchParams);
    if (catId) newParams.set('category', catId);
    else newParams.delete('category');
    setSearchParams(newParams);
  };

  // Sync barangay param with URL and fly to canonical barangay coordinates
  const handleBarangaySelect = (bName) => {
    setSelectedBarangay(bName);
    const newParams = new URLSearchParams(searchParams);
    if (bName) {
      newParams.set('barangay', bName);
      selectBarangay(bName);
      const bCoords = getBarangayCoordinates(bName);
      setFlyTarget({ coords: bCoords, zoom: 15 });
    } else {
      newParams.delete('barangay');
      setFlyTarget({ coords: ROXAS_CENTER, zoom: 13 });
    }
    setSearchParams(newParams);
  };

  // High Accuracy Browser GPS Trigger - Calibrated strictly for Roxas
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser');
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setLocating(false);

        if (!isWithinRoxas(lat, lng)) {
          toast('Your device GPS is outside Roxas. Calibrating distances from Roxas reference.', {
            icon: '📍'
          });
          const fallbackCoords = getBarangayCoordinates(selectedBarangay || 'Poblacion');
          setUserLocation(fallbackCoords);
          setCustomerCoords(fallbackCoords);
          setIsGpsSource(false);
          setFlyTarget({ coords: fallbackCoords, zoom: 14 });
          return;
        }

        const coords = [lat, lng];
        setUserLocation(coords);
        setCustomerCoords(coords);
        setIsGpsSource(true);
        setPermissionDenied(false);
        setFlyTarget({ coords, zoom: 15 });
        toast.success('Exact GPS location captured in Roxas!');
      },
      (err) => {
        setLocating(false);
        console.warn('Geolocation error:', err.message);
        setPermissionDenied(true);
        setShowManualBar(true);
        toast.error('Location permission was denied or timed out. Please select your Roxas barangay.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Manual Address Search (Forward Geocoding) - Restricted strictly to Roxas
  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    if (!manualQuery.trim()) return toast.error('Please enter a Roxas location or landmark name');

    setSearchingManual(true);
    try {
      const res = await api.get('/products/geocode/search', {
        params: { q: `${manualQuery.trim()}, Roxas, Oriental Mindoro` }
      });
      const results = res.data?.data || [];
      if (results.length > 0) {
        const topResult = results[0];
        const newLat = parseFloat(parseFloat(topResult.lat).toFixed(6));
        const newLng = parseFloat(parseFloat(topResult.lon).toFixed(6));

        if (!isWithinRoxas(newLat, newLng)) {
          toast.error('Only locations within Roxas, Oriental Mindoro are allowed.');
          return;
        }

        const coords = [newLat, newLng];
        setUserLocation(coords);
        setCustomerCoords(coords);
        setIsGpsSource(false);
        setFlyTarget({ coords, zoom: 15 });
        toast.success(`Location set: ${topResult.display_name.split(',')[0]}`);
        setShowManualBar(false);
      } else {
        toast.error('Location not found in Roxas. Select a Barangay or click "Pin on Map".');
      }
    } catch (err) {
      console.warn('Manual geocode search failed:', err);
      toast.error('Search failed. You can click "Pin on Map" to drop your pin directly.');
    } finally {
      setSearchingManual(false);
    }
  };

  // Handle direct click on map to set user location - strictly validates Roxas boundaries
  const handleSelectMapPoint = (lat, lng) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    if (!isWithinRoxas(roundedLat, roundedLng)) {
      return toast.error('Only locations within Roxas, Oriental Mindoro are allowed.');
    }

    const coords = [roundedLat, roundedLng];
    setUserLocation(coords);
    setCustomerCoords(coords);
    setIsGpsSource(false);
    setIsManualPinMode(false);
    setShowManualBar(false);
    toast.success(`Beacon pinned inside Roxas: ${roundedLat}, ${roundedLng}`);
  };

  // Fetch products whenever bounds, category, barangay, or radius changes
  useEffect(() => {
    setLoading(true);

    const query = { limit: 60 };

    if (selectedCategory) {
      query.category = selectedCategory;
    }

    if (selectedBarangay) {
      query.barangay = selectedBarangay;
    }

    if (selectedRadius && userLocation) {
      // Radius query from user's GPS / local beacon
      query.userLat = userLocation[0];
      query.userLng = userLocation[1];
      query.radiusKm = selectedRadius;
    } else if (bounds) {
      // Standard viewport bounding box
      query.minLat = bounds.minLat;
      query.maxLat = bounds.maxLat;
      query.minLng = bounds.minLng;
      query.maxLng = bounds.maxLng;
    }

    getProducts(query)
      .then(res => setProducts(res.data?.data?.products || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bounds, selectedCategory, selectedBarangay, selectedRadius, userLocation]);

  // Center for the radius circle overlay
  const circleCenter = userLocation || (bounds ? [bounds.centerLat, bounds.centerLng] : defaultCenter);

  // Scroll card into view when map marker is clicked
  const handleMarkerClick = (id) => {
    setSelectedId(id);
    const cardEl = cardRefs.current[id];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Determine active item for Developer Inspector
  const activeProduct = products.find(p => p.id === (hoveredId || selectedId)) || products[0] || null;

  // Real-time calculated Haversine distance for Developer Inspector
  const activeDistanceKm = (userLocation && activeProduct && activeProduct.latitude && activeProduct.longitude)
    ? calculateDistance(userLocation[0], userLocation[1], activeProduct.latitude, activeProduct.longitude)
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white font-sans">

      {/* ══ TOP CONTROLS & FILTER BAR ════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 z-20 shadow-xs flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* Left: View Switch, Barangay Selector & Count */}
          <div className="flex items-center flex-wrap gap-2.5">
            <Link
              to="/browse"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" /> List View
            </Link>

            {/* Barangay Dropdown Filter */}
            <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200/80 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-[#1e3a8a] flex-shrink-0" />
              <span className="font-bold text-[#1e3a8a] text-[11px] hidden sm:inline">Barangay:</span>
              <select
                value={selectedBarangay}
                onChange={e => handleBarangaySelect(e.target.value)}
                className="bg-transparent font-semibold text-gray-900 outline-none cursor-pointer text-xs pr-1 border-none"
              >
                <option value="">All Barangays (Roxas)</option>
                {ROXAS_BARANGAYS.map(b => (
                  <option key={b.name} value={b.name}>
                    Brgy. {b.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-semibold text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-100">
              {loading ? 'Searching area...' : `${products.length} in Roxas`}
            </span>
          </div>

          {/* Right: GPS Locate, Manual Select & Radius Chips */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* GPS High-Accuracy Button */}
            <button
              onClick={handleLocateMe}
              disabled={locating}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition shadow-xs cursor-pointer ${
                userLocation && isGpsSource
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : userLocation
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title="Detect exact GPS location using browser high accuracy"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin text-[#1e3a8a]' : userLocation ? 'text-emerald-600' : 'text-gray-500'}`} />
              <span>{locating ? 'Capturing GPS…' : userLocation ? (isGpsSource ? 'GPS Active' : 'Beacon Active') : 'Locate Me'}</span>
            </button>

            {/* Manual Location Input Toggle */}
            <button
              onClick={() => {
                setShowManualBar(v => !v);
                setIsManualPinMode(false);
              }}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                showManualBar || isManualPinMode
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
              title="Set your location manually if GPS is denied"
            >
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>Set Manually</span>
            </button>

            {/* Radius Filters: 500m, 1km, 2km, 5km, 10km, 15km */}
            <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-xl border border-gray-200">
              {RADIUS_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setSelectedRadius(opt.value)}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition cursor-pointer ${
                    selectedRadius === opt.value
                      ? 'bg-[#1e3a8a] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Categories Quick-Pills Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                  isActive
                    ? 'bg-[#1e3a8a] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── PERMISSION DENIED OR MANUAL LOCATION BAR ── */}
        {(showManualBar || permissionDenied) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                {permissionDenied
                  ? 'Location access denied or unavailable. Enter your city or click "Pin on Map" to calculate distances.'
                  : 'Search your neighborhood/city or click "Pin on Map" to position your beacon.'}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <form onSubmit={handleManualSearch} className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={manualQuery}
                  onChange={e => setManualQuery(e.target.value)}
                  placeholder="e.g. Quezon City, Pasig, BGC"
                  className="w-full pl-8 pr-16 py-1.5 text-xs bg-white border border-amber-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 text-gray-800"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="submit"
                  disabled={searchingManual}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-[#1e3a8a] text-white px-2 py-0.5 rounded cursor-pointer hover:bg-blue-800 disabled:opacity-50"
                >
                  {searchingManual ? 'Finding…' : 'Find'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setIsManualPinMode(v => !v);
                  if (!isManualPinMode) toast.success('Click anywhere on the map to set your location');
                }}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  isManualPinMode
                    ? 'bg-amber-600 text-white border-amber-700 animate-pulse'
                    : 'bg-white text-gray-700 border-amber-300 hover:bg-amber-100/50'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{isManualPinMode ? 'Click on Map Now' : 'Pin on Map'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowManualBar(false);
                  setPermissionDenied(false);
                  setIsManualPinMode(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ MAIN WORKSPACE: SIDEBAR + LEAFLET MAP ═══════════════════ */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left Sidebar: Scrollable Item Cards */}
        <div className="w-full md:w-[420px] lg:w-[460px] bg-[#fcfbfa] flex-shrink-0 flex flex-col h-full border-r border-gray-200 z-10 absolute md:relative top-0 left-0 bottom-0 pointer-events-none md:pointer-events-auto transition-transform">
          <div className="p-4 flex-1 overflow-y-auto pointer-events-auto h-full space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-base font-black text-gray-900 tracking-tight">
                {selectedCategory ? `${selectedCategory} Equipment` : 'Explore Nearby Equipment'}
              </h1>
              {selectedRadius && (
                <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  within {selectedRadius} km
                </span>
              )}
            </div>

            {loading && !products.length ? (
              <div className="flex justify-center p-12"><LoadingSpinner /></div>
            ) : products.length === 0 ? (
              <div className="text-center p-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <MapPin className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-gray-700 text-sm">No equipment found in this area</p>
                <p className="text-xs text-gray-400 mt-1">Try expanding your radius, zooming out, or switching category.</p>
                {selectedRadius && (
                  <button
                    onClick={() => setSelectedRadius(null)}
                    className="mt-3 text-xs text-[#1e3a8a] font-semibold hover:underline cursor-pointer"
                  >
                    Clear radius filter
                  </button>
                )}
              </div>
            ) : (
              products.map(product => {
                const img = product.primary_image
                  ? (product.primary_image.startsWith('http') ? product.primary_image : `${BASE_URL}${product.primary_image}`)
                  : 'https://placehold.co/400x300/1e3a8a/ffffff?text=Product';

                const isHovered = hoveredId === product.id;
                const isSelected = selectedId === product.id;
                const distText = getItemDistance(product.latitude, product.longitude);

                return (
                  <div
                    key={product.id}
                    ref={el => (cardRefs.current[product.id] = el)}
                    onMouseEnter={() => setHoveredId(product.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`bg-white rounded-2xl p-3 flex gap-3.5 border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-[#1e3a8a] shadow-md ring-2 ring-blue-100'
                        : isHovered
                        ? 'border-blue-300 shadow-md translate-y-[-1px]'
                        : 'border-gray-100 shadow-xs hover:border-gray-200'
                    }`}
                    onClick={() => {
                      setSelectedId(product.id);
                      if (product.latitude && product.longitude) {
                        setFlyTarget({ coords: [product.latitude, product.longitude], zoom: 15 });
                      }
                    }}
                  >
                    {/* Image */}
                    <div className="w-28 h-24 bg-[#f5f0e8] rounded-xl flex-shrink-0 overflow-hidden relative">
                      <img src={img} alt={product.title} className="w-full h-full object-cover" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{product.category}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-bold text-gray-700">{Number(product.avg_rating || 0).toFixed(1)}</span>
                        </div>
                      </div>

                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 mb-0.5">{product.title}</h3>

                      {/* Supplier & Distance Row */}
                      <div className="text-[11px] text-gray-500 flex items-center justify-between gap-1 mb-1">
                        <span className="truncate text-gray-600">By {product.supplier_name || 'Verified Supplier'}</span>
                        {distText && (
                          <span className="text-[10px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0">
                            <Navigation className="w-2.5 h-2.5" />
                            {distText}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-500 flex items-center gap-1 line-clamp-1 mb-2">
                        <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                        <span className="truncate font-medium text-gray-700">
                          {product.barangay ? `Brgy. ${product.barangay}, Roxas, Oriental Mindoro` : (product.location || 'Roxas, Oriental Mindoro')}
                        </span>
                      </div>

                      <div className="mt-auto flex items-end justify-between pt-1">
                        <div>
                          <span className="text-base font-black text-[#1e3a8a]">₱{product.price_per_day?.toLocaleString()}</span>
                          <span className="text-[11px] text-gray-400 font-medium"> /day</span>
                        </div>
                        <Link
                          to={`/product/${product.id}`}
                          onClick={e => e.stopPropagation()}
                          className="bg-gray-100 hover:bg-[#1e3a8a] hover:text-white text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                          View Details <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Leaflet Interactive Map */}
        <div className="flex-1 h-full z-0 relative bg-gray-100">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            minZoom={12}
            maxZoom={18}
            maxBounds={ROXAS_BOUNDS}
            maxBoundsViscosity={1.0}
            style={{ width: '100%', height: '100%' }}
            whenReady={(e) => {
              const map = e.target;
              const b = map.getBounds();
              setBounds({
                minLat: b.getSouth(),
                maxLat: b.getNorth(),
                minLng: b.getWest(),
                maxLng: b.getEast(),
                centerLat: map.getCenter().lat,
                centerLng: map.getCenter().lng
              });
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController flyTarget={flyTarget} onBoundsChange={setBounds} />
            <MapClickHandler active={isManualPinMode} onSelectLocation={handleSelectMapPoint} />

            {/* Radius Overlay Circle */}
            {selectedRadius && circleCenter && (
              <Circle
                center={circleCenter}
                radius={selectedRadius * 1000}
                pathOptions={{
                  color: '#1e3a8a',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: '6, 6'
                }}
              />
            )}

            {/* User GPS Location Beacon */}
            {userLocation && (
              <Marker position={userLocation} icon={userBeaconIcon}>
                <Popup className="rounded-xl overflow-hidden">
                  <div className="text-center p-1.5 font-sans">
                    <p className="font-bold text-gray-900 text-xs flex items-center justify-center gap-1">
                      <span>📍</span>
                      <span>You are here</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {isGpsSource ? 'High-Accuracy Browser GPS' : 'Roxas Location Beacon'}
                    </p>
                    <p className="text-[10px] font-mono text-gray-400 mt-1">
                      {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Product Markers with Rich Popups */}
            {products.map(product => {
              if (!product.latitude || !product.longitude) return null;
              const isHovered = hoveredId === product.id;
              const isSelected = selectedId === product.id;
              const distText = getItemDistance(product.latitude, product.longitude);

              return (
                <Marker
                  key={product.id}
                  position={[product.latitude, product.longitude]}
                  icon={isHovered || isSelected ? highlightedItemIcon : new L.Icon.Default()}
                  eventHandlers={{
                    click: () => handleMarkerClick(product.id)
                  }}
                >
                  <Popup className="rounded-2xl overflow-hidden shadow-xl">
                    <div className="w-52 pb-1 font-sans">
                      <div className="relative w-full h-28 overflow-hidden rounded-xl mb-2 bg-gray-100">
                        <img
                          src={product.primary_image ? (product.primary_image.startsWith('http') ? product.primary_image : `${BASE_URL}${product.primary_image}`) : 'https://placehold.co/400x300'}
                          className="w-full h-full object-cover"
                          alt={product.title}
                        />
                        <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {product.category}
                        </span>
                      </div>

                      <h4 className="font-bold text-gray-900 text-sm mb-1 leading-tight line-clamp-1">{product.title}</h4>

                      {/* Supplier Name */}
                      <p className="text-[11px] text-gray-600 mb-1">
                        Listed by: <strong className="text-gray-900 font-semibold">{product.supplier_name || 'Verified Supplier'}</strong>
                      </p>

                      {/* Distance readout */}
                      {distText && (
                        <div className="flex items-center justify-between text-[11px] bg-blue-50 text-[#1e3a8a] px-2 py-1 rounded-lg font-semibold mb-2 border border-blue-100">
                          <span className="flex items-center gap-1">
                            <Navigation className="w-3 h-3" /> Distance:
                          </span>
                          <span className="font-bold">{distText}</span>
                        </div>
                      )}

                      <div className="text-[10px] text-gray-600 flex items-center gap-1 mb-2 line-clamp-1">
                        <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                        <span className="truncate">
                          {product.barangay ? `Brgy. ${product.barangay}, Roxas, Oriental Mindoro` : (product.location || 'Roxas, Oriental Mindoro')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-sm font-extrabold text-[#1e3a8a]">₱{product.price_per_day?.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">/day</span></span>
                      </div>

                      <Link
                        to={`/product/${product.id}`}
                        className="block w-full bg-[#1e3a8a] hover:bg-blue-800 text-white text-center py-2 rounded-xl text-xs font-semibold shadow-xs transition"
                      >
                        View Details
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          </MapContainer>

          {/* Floating Manual Pin Mode Guide Pill */}
          {isManualPinMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-amber-500 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg flex items-center gap-2 animate-bounce pointer-events-none">
              <Crosshair className="w-4 h-4" />
              <span>Click anywhere on the map to place your location beacon</span>
            </div>
          )}

          {/* ══ DEVELOPER DEBUG PANEL: LOCATION INSPECTOR ══════════════ */}
          {showDebugInspector && (
            <div className="absolute bottom-4 right-4 z-[400] max-w-xs sm:max-w-sm w-full font-sans transition-all duration-300">
              <div className="bg-slate-900/90 text-white backdrop-blur-md border border-slate-700/70 rounded-2xl p-3.5 shadow-2xl space-y-2">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Bug className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs tracking-wide">Location Inspector</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">Live</span>
                  </div>
                  <button
                    onClick={() => setIsInspectorMinimized(v => !v)}
                    className="text-slate-400 hover:text-white p-1 transition cursor-pointer"
                    title={isInspectorMinimized ? 'Expand inspector' : 'Minimize inspector'}
                  >
                    {isInspectorMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {!isInspectorMinimized && (
                  <div className="space-y-2 text-[11px] pt-1">
                    
                    {/* User GPS Coordinates */}
                    <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/50">
                      <div className="text-slate-400 font-medium flex items-center justify-between mb-1">
                        <span>User Coordinates:</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          isGpsSource ? 'bg-emerald-900/60 text-emerald-300' : 'bg-blue-900/60 text-blue-300'
                        }`}>
                          {userLocation ? (isGpsSource ? 'GPS (High Accuracy)' : 'Manual Pin') : 'Not Set'}
                        </span>
                      </div>
                      <div className="font-mono text-emerald-400 font-bold">
                        {userLocation ? `${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}` : 'Awaiting GPS prompt...'}
                      </div>
                    </div>

                    {/* Active/Target Equipment Coordinates */}
                    <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/50">
                      <div className="text-slate-400 font-medium truncate mb-1">
                        Equipment: <span className="text-white font-semibold">{activeProduct ? activeProduct.title : 'None selected'}</span>
                      </div>
                      {activeProduct ? (
                        <>
                          <div className="font-mono text-blue-400 font-bold mb-0.5">
                            {activeProduct.latitude && activeProduct.longitude
                              ? `${Number(activeProduct.latitude).toFixed(6)}, ${Number(activeProduct.longitude).toFixed(6)}`
                              : 'No GPS calibrated'}
                          </div>
                          <div className="text-emerald-300 text-[10px] font-semibold truncate">
                            {activeProduct.barangay ? `Brgy. ${activeProduct.barangay}, Roxas` : 'Roxas, Oriental Mindoro'}
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-500 italic text-[10px]">Hover or click a card/pin</div>
                      )}
                    </div>

                    {/* Calculated Haversine Distance */}
                    <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/50 flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Haversine Distance:</span>
                      <span className="font-mono text-amber-300 font-extrabold text-xs">
                        {activeDistanceKm != null
                          ? `${activeDistanceKm.toFixed(3)} km (${Math.round(activeDistanceKm * 1000)} m)`
                          : 'N/A (No Coords)'}
                      </span>
                    </div>

                    {/* Radius & Listings Count */}
                    <div className="flex items-center justify-between text-slate-400 text-[10px] px-1 pt-0.5">
                      <span>Radius: <strong className="text-white">{selectedRadius ? `${selectedRadius} km` : 'All'}</strong></span>
                      <span>Barangay: <strong className="text-white">{selectedBarangay || 'All'}</strong></span>
                      <span>Listings: <strong className="text-white">{products.length}</strong></span>
                    </div>

                  </div>
                )}

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
