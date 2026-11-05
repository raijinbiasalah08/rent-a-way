import "./MapSearch.css";
import {
  LayoutGrid,
  Camera,
  Tent,
  Dumbbell,
  CalendarDays,
  Home,
  GraduationCap,
  RotateCcw,
} from "lucide-react";
import { apiAssetUrl } from "../../config";
import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Filter,
  Star,
  Navigation,
  MapPin,
  LocateFixed,
  ArrowRight,
  Search,
  AlertCircle,
  Bug,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Crosshair,
  Loader2,
  X,
  Compass,
} from "lucide-react";
import { getProducts } from "../../api/products";
import { useCustomerLocation } from "../../context/CustomerLocationContext";
import { calculateDistance, formatDistance } from "../../utils/geo";
import { API_ORIGIN } from "../../config";
import {
  ROXAS_CENTER,
  ROXAS_BOUNDS,
  ROXAS_BARANGAYS,
  isWithinRoxas,
  getBarangayCoordinates,
  formatRoxasAddress,
} from "../../utils/roxasLocation";
import api from "../../api/axios";
import LoadingSpinner from "../../components/LoadingSpinner";
import toast from "react-hot-toast";

const CATEGORIES = [
  { id: "", label: "All equipment", icon: LayoutGrid },
  { id: "Cameras", label: "Cameras", icon: Camera },
  { id: "Camping", label: "Camping", icon: Tent },
  { id: "Sports", label: "Sports", icon: Dumbbell },
  { id: "Event", label: "Events", icon: CalendarDays },
  { id: "Household", label: "Household", icon: Home },
  { id: "School", label: "School", icon: GraduationCap },
];
function priceIcon(price, active) {
  const amount = Number(price);
  return L.divIcon({
    className: "rental-price-marker",
    html:
      '<span class="' +
      (active ? "is-active" : "") +
      '">₱' +
      (Number.isFinite(amount) ? amount.toLocaleString("en-PH") : "—") +
      "</span>",
    iconSize: [92, 38],
    iconAnchor: [46, 38],
    popupAnchor: [0, -40],
  });
}

function EquipmentMarker({ product, active, children, ...props }) {
  const position = useMemo(
    () => [Number(product.latitude), Number(product.longitude)],
    [product.latitude, product.longitude],
  );
  const icon = useMemo(
    () => priceIcon(product.price_per_day, active),
    [product.price_per_day, active],
  );
  return (
    <Marker position={position} icon={icon} {...props}>
      {children}
    </Marker>
  );
}

const RADIUS_OPTIONS = [
  { label: "All", value: null },
  { label: "500 m", value: 0.5 },
  { label: "1 km", value: 1 },
  { label: "2 km", value: 2 },
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "15 km", value: 15 },
];

// Custom User Location Pulsing Icon
const userBeaconIcon = L.divIcon({
  className: "user-beacon-marker",
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
      <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: rgba(30, 58, 138, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 16px; height: 16px; border-radius: 50%; background-color: #1e3a8a; border: 3px solid #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.35); z-index: 10;"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Helper component to handle map instance and smooth fly-to
function MapController({ flyTarget, onBoundsChange }) {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      map.invalidateSize({ animate: false, debounceMoveend: true }),
    );
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (
      flyTarget &&
      flyTarget.coords &&
      flyTarget.coords[0] &&
      flyTarget.coords[1]
    ) {
      map.flyTo(flyTarget.coords, flyTarget.zoom || 14, {
        duration: 0.7,
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
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
        centerLng: map.getCenter().lng,
      });
    },
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
    },
  });
  return null;
}

export default function MapSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") || "";
  const barangayParam = searchParams.get("barangay") || "";

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedBarangay, setSelectedBarangay] = useState(barangayParam);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const mapPanelRef = useRef(null);
  const [bounds, setBounds] = useState(null);

  // Geolocation & Radius state
  const {
    customerCoords,
    setCustomerCoords,
    requestCustomerLocation,
    selectBarangay,
  } = useCustomerLocation();
  const [userLocation, setUserLocation] = useState(
    customerCoords || ROXAS_CENTER,
  );
  const [isGpsSource, setIsGpsSource] = useState(false);
  const [locating, setLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(null); // in km
  const [flyTarget, setFlyTarget] = useState(null);

  // Manual Location Selection Fallback state
  const [showManualBar, setShowManualBar] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
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
      const initialCoords = barangayParam
        ? getBarangayCoordinates(barangayParam)
        : customerCoords;
      setUserLocation(initialCoords);
      setFlyTarget({
        coords: barangayParam
          ? getBarangayCoordinates(barangayParam)
          : customerCoords,
        zoom: 14,
      });
    } else {
      // Prompt user for high-accuracy browser geolocation
      requestCustomerLocation(true)
        .then((coords) => {
          setUserLocation(coords);
          setIsGpsSource(true);
          setFlyTarget({ coords, zoom: 14 });
        })
        .catch((err) => {
          console.warn(
            "Geolocation auto-prompt error or dismissed:",
            err.message,
          );
          setPermissionDenied(true);
        });
    }
  }, []);

  useEffect(() => {
    setSelectedCategory(categoryParam);
    setSelectedBarangay(barangayParam);
  }, [categoryParam, barangayParam]);

  // Sync category param with URL
  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    const newParams = new URLSearchParams(searchParams);
    if (catId) newParams.set("category", catId);
    else newParams.delete("category");
    setSearchParams(newParams);
  };

  // Sync barangay param with URL and fly to canonical barangay coordinates
  const handleBarangaySelect = (bName) => {
    setSelectedBarangay(bName);
    const newParams = new URLSearchParams(searchParams);
    if (bName) {
      newParams.set("barangay", bName);
      selectBarangay(bName);
      setUserLocation(getBarangayCoordinates(bName));
      setIsGpsSource(false);
      const bCoords = getBarangayCoordinates(bName);
      setFlyTarget({ coords: bCoords, zoom: 15 });
    } else {
      newParams.delete("barangay");
      setFlyTarget({ coords: ROXAS_CENTER, zoom: 13 });
    }
    setSearchParams(newParams);
  };

  // High Accuracy Browser GPS Trigger - Calibrated strictly for Roxas
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      return toast.error("Geolocation is not supported by your browser");
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setLocating(false);

        if (!isWithinRoxas(lat, lng)) {
          toast(
            "Your device GPS is outside Roxas. Calibrating distances from Roxas reference.",
            {
              icon: "📍",
            },
          );
          const fallbackCoords = getBarangayCoordinates(
            selectedBarangay || "Poblacion",
          );
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
        toast.success("Exact GPS location captured in Roxas!");
      },
      (err) => {
        setLocating(false);
        console.warn("Geolocation error:", err.message);
        setPermissionDenied(true);
        setShowManualBar(true);
        toast.error(
          "Location permission was denied or timed out. Please select your Roxas barangay.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Manual Address Search (Forward Geocoding) - Restricted strictly to Roxas
  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    if (!manualQuery.trim())
      return toast.error("Please enter a Roxas location or landmark name");

    setSearchingManual(true);
    try {
      const res = await api.get("/products/geocode/search", {
        params: { q: `${manualQuery.trim()}, Roxas, Oriental Mindoro` },
      });
      const results = res.data?.data || [];
      if (results.length > 0) {
        const topResult = results[0];
        const newLat = parseFloat(parseFloat(topResult.lat).toFixed(6));
        const newLng = parseFloat(parseFloat(topResult.lon).toFixed(6));

        if (!isWithinRoxas(newLat, newLng)) {
          toast.error(
            "Only locations within Roxas, Oriental Mindoro are allowed.",
          );
          return;
        }

        const coords = [newLat, newLng];
        setUserLocation(coords);
        setCustomerCoords(coords);
        setIsGpsSource(false);
        setFlyTarget({ coords, zoom: 15 });
        toast.success(`Location set: ${topResult.display_name.split(",")[0]}`);
        setShowManualBar(false);
        setPermissionDenied(false);
        setIsManualPinMode(false);
      } else {
        toast.error(
          'Location not found in Roxas. Select a Barangay or click "Pin on Map".',
        );
      }
    } catch (err) {
      console.warn("Manual geocode search failed:", err);
      toast.error(
        'Search failed. You can click "Pin on Map" to drop your pin directly.',
      );
    } finally {
      setSearchingManual(false);
    }
  };

  // Handle direct click on map to set user location - strictly validates Roxas boundaries
  const handleSelectMapPoint = (lat, lng) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    if (!isWithinRoxas(roundedLat, roundedLng)) {
      return toast.error(
        "Only locations within Roxas, Oriental Mindoro are allowed.",
      );
    }

    const coords = [roundedLat, roundedLng];
    setUserLocation(coords);
    setCustomerCoords(coords);
    setIsGpsSource(false);
    setIsManualPinMode(false);
    setShowManualBar(false);
    setPermissionDenied(false);
    toast.success("Search location updated");
  };

  // Fetch products whenever bounds, category, barangay, or radius changes
  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError("");

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
      .then((res) => {
        if (current) setProducts(res.data?.data?.products || []);
      })
      .catch(() => {
        if (current)
          setLoadError("We couldn’t load this area. Please try again.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [
    bounds,
    selectedCategory,
    selectedBarangay,
    selectedRadius,
    userLocation,
    retry,
  ]);

  // Center for the radius circle overlay
  const circleCenter =
    userLocation ||
    (bounds ? [bounds.centerLat, bounds.centerLng] : defaultCenter);

  // Scroll card into view when map marker is clicked
  const handleMarkerClick = (id) => {
    setSelectedId(id);
    const cardEl = cardRefs.current[id];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Determine active item for Developer Inspector
  const activeProduct =
    products.find((p) => p.id === (hoveredId || selectedId)) ||
    products[0] ||
    null;

  // Real-time calculated Haversine distance for Developer Inspector
  const activeDistanceKm =
    userLocation &&
    activeProduct &&
    activeProduct.latitude &&
    activeProduct.longitude
      ? calculateDistance(
          userLocation[0],
          userLocation[1],
          activeProduct.latitude,
          activeProduct.longitude,
        )
      : null;

  const browseParams = new URLSearchParams();
  if (selectedCategory) browseParams.set("category", selectedCategory);
  if (selectedBarangay) browseParams.set("barangay", selectedBarangay);
  const browseUrl = "/browse" + (browseParams.size ? "?" + browseParams : "");
  function resetFilters() {
    setSelectedRadius(null);
    setSelectedCategory("");
    setSelectedBarangay("");
    setSearchParams({});
    setSelectedId(null);
    setFlyTarget({ coords: ROXAS_CENTER, zoom: 13 });
  }
  function showProductOnMap(product) {
    setSelectedId(product.id);
    if (product.latitude && product.longitude) {
      setFlyTarget({
        coords: [Number(product.latitude), Number(product.longitude)],
        zoom: 15,
      });
      if (window.innerWidth < 768)
        mapPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }
  }

  return (
    <div className="map-explorer">
      <div className="map-explorer-container">
        <header className="map-page-heading">
          <div>
            <p className="map-eyebrow">Explore Roxas</p>
            <h1>Great gear. Closer than you think.</h1>
            <p>
              Find local equipment and choose a pickup spot that works for you.
            </p>
          </div>
          <div className="map-view-switch">
            <Link to={browseUrl}>
              <LayoutGrid size={16} />
              List
            </Link>
            <span aria-current="page">
              <MapPin size={16} />
              Map
            </span>
          </div>
        </header>
        <div className="map-toolbar">
          <div className="map-location-controls">
            <label className="map-barangay">
              <MapPin size={20} />
              <span>
                <span className="map-control-label">Search area</span>
                <select
                  aria-label="Search barangay"
                  value={selectedBarangay}
                  onChange={(e) => handleBarangaySelect(e.target.value)}
                >
                  <option value="">All barangays, Roxas</option>
                  {ROXAS_BARANGAYS.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <button
              className="map-control-button"
              onClick={handleLocateMe}
              disabled={locating}
            >
              <LocateFixed
                size={17}
                className={locating ? "animate-spin" : ""}
              />
              {locating ? "Locating…" : "Use my location"}
            </button>
            <button
              className={
                showManualBar
                  ? "map-control-button is-active"
                  : "map-control-button"
              }
              aria-expanded={showManualBar || permissionDenied}
              aria-controls="manual-location-controls"
              onClick={() => {
                setShowManualBar((v) => !v);
                setPermissionDenied(false);
                setIsManualPinMode(false);
              }}
            >
              <Compass size={17} />
              Set location
            </button>
            <div className="map-radius">
              <span className="map-control-label">
                Distance from search point
              </span>
              <div role="group" aria-label="Search radius">
                {RADIUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    aria-pressed={selectedRadius === opt.value}
                    onClick={() => setSelectedRadius(opt.value)}
                    className={selectedRadius === opt.value ? "is-active" : ""}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <nav className="map-categories" aria-label="Map equipment categories">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  aria-pressed={selectedCategory === cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={selectedCategory === cat.id ? "is-active" : ""}
                >
                  <Icon size={18} />
                  {cat.label}
                </button>
              );
            })}
          </nav>
          {/* ── PERMISSION DENIED OR MANUAL LOCATION BAR ── */}
          {(showManualBar || permissionDenied) && (
            <div id="manual-location-controls" className="map-manual-controls">
              <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  {permissionDenied
                    ? "Location access denied or unavailable. Search a Roxas landmark or choose a point on the map."
                    : "Search a Roxas landmark or choose a point on the map."}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <form
                  onSubmit={handleManualSearch}
                  className="relative flex-1 sm:w-64"
                >
                  <input
                    type="text"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    aria-label="Roxas landmark"
                    placeholder="e.g. Roxas municipal hall"
                    className="w-full pl-8 pr-16 py-1.5 text-xs bg-white border border-amber-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 text-gray-800"
                  />

                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="submit"
                    disabled={searchingManual}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-[#1e3a8a] text-white px-2 py-0.5 rounded cursor-pointer hover:bg-blue-800 disabled:opacity-50"
                  >
                    {searchingManual ? "Finding…" : "Find"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setIsManualPinMode((v) => !v);
                    mapPanelRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    if (!isManualPinMode)
                      toast.success(
                        "Click anywhere on the map to set your location",
                      );
                  }}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    isManualPinMode
                      ? "bg-amber-600 text-white border-amber-700 animate-pulse"
                      : "bg-white text-gray-700 border-amber-300 hover:bg-amber-100/50"
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>
                    {isManualPinMode ? "Click on Map Now" : "Pin on Map"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowManualBar(false);
                    setPermissionDenied(false);
                    setIsManualPinMode(false);
                  }}
                  aria-label="Close location controls"
                  className="text-gray-400 hover:text-gray-600 p-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="map-workspace">
          <section className="map-results-panel" aria-label="Nearby equipment">
            <div className="map-results-header">
              <div>
                <h2>Nearby equipment</h2>
                <p role="status">
                  {loading
                    ? "Searching this area…"
                    : loadError
                      ? "Unable to load listings"
                      : products.length +
                        (products.length === 1
                          ? " listing in view"
                          : " listings in view")}
                  {selectedRadius ? " · Within " + selectedRadius + " km" : ""}
                </p>
              </div>
              <button
                onClick={resetFilters}
                aria-label="Reset map filters"
                title="Reset filters"
              >
                <RotateCcw size={17} />
              </button>
            </div>
            <p className="map-results-hint">
              Select a price pin or a listing to explore.
            </p>
            <div className="map-result-cards">
              {loadError ? (
                <div className="map-empty" role="alert">
                  <AlertCircle size={28} />
                  <h3>Let’s try that again</h3>
                  <p>{loadError}</p>
                  <button onClick={() => setRetry((n) => n + 1)}>Retry</button>
                </div>
              ) : loading && !products.length ? (
                <div className="map-empty" role="status">
                  <LoadingSpinner />
                  <p>Finding equipment nearby…</p>
                </div>
              ) : products.length === 0 ? (
                <div className="map-empty">
                  <MapPin size={30} />
                  <h3>No equipment in this area</h3>
                  <p>
                    Try a wider radius, move the map, or explore another
                    category.
                  </p>
                  <button onClick={resetFilters}>Reset filters</button>
                </div>
              ) : (
                products.map((product) => {
                  const distance = userLocation
                    ? formatDistance(
                        calculateDistance(
                          ...userLocation,
                          product.latitude,
                          product.longitude,
                        ),
                      )
                    : null;
                  return (
                    <article
                      key={product.id}
                      ref={(el) => (cardRefs.current[product.id] = el)}
                      onMouseEnter={() => setHoveredId(product.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={
                        selectedId === product.id
                          ? "map-rental-card is-selected"
                          : "map-rental-card"
                      }
                    >
                      <button
                        className="map-card-photo"
                        onClick={() => showProductOnMap(product)}
                        aria-label={"Show " + product.title + " on map"}
                      >
                        <img
                          src={
                            apiAssetUrl(product.primary_image) ||
                            "/placeholder.svg"
                          }
                          alt={product.title}
                          loading="lazy"
                          onError={(e) => {
                            if (
                              !e.currentTarget.src.endsWith("/placeholder.svg")
                            )
                              e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                        <span
                          className={
                            product.availability === "available"
                              ? "available"
                              : ""
                          }
                        >
                          {product.availability === "available"
                            ? "Available"
                            : "Check availability"}
                        </span>
                      </button>
                      <div className="map-card-body">
                        <div className="map-card-meta">
                          <span>{product.category}</span>
                          {Number(product.avg_rating) > 0 ? (
                            <span>
                              <Star size={13} fill="currentColor" />
                              {Number(product.avg_rating).toFixed(1)}
                            </span>
                          ) : (
                            <span>No reviews yet</span>
                          )}
                        </div>
                        <h3>
                          <button onClick={() => showProductOnMap(product)}>
                            {product.title}
                          </button>
                        </h3>
                        <p className="map-card-supplier">
                          Listed by{" "}
                          {product.supplier_name || "a local supplier"}
                        </p>
                        <div className="map-card-location">
                          <MapPin size={14} />
                          <span>
                            {product.barangay
                              ? product.barangay + ", Roxas"
                              : product.location || "Roxas, Oriental Mindoro"}
                          </span>
                        </div>
                        {distance && (
                          <p className="map-card-distance">
                            <Navigation size={13} />
                            {distance}
                            <span>from search point</span>
                          </p>
                        )}
                        <div className="map-card-actions">
                          <p>
                            <strong>
                              ₱
                              {Number(
                                product.price_per_day || 0,
                              ).toLocaleString("en-PH")}
                            </strong>
                            <span> / day</span>
                          </p>
                          <Link to={"/product/" + product.id}>
                            View details <ArrowRight size={16} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            <div className="map-results-footer">
              <Compass size={17} />
              <span>
                Distances are straight-line estimates from your search point.
              </span>
            </div>
          </section>

          {/* Right Side: Leaflet Interactive Map */}
          <div
            ref={mapPanelRef}
            className={`map-canvas-panel ${isManualPinMode ? "is-pinning" : ""}`}
            aria-label="Equipment map"
          >
            <div className="map-canvas-caption">
              <span className="map-legend-dot" />
              <span>
                {isGpsSource ? "GPS search point" : "Selected search point"}
              </span>
              <span className="map-caption-divider" />
              <span>Move the map to explore</span>
            </div>
            <MapContainer
              center={defaultCenter}
              zoom={13}
              minZoom={12}
              maxZoom={18}
              maxBounds={ROXAS_BOUNDS}
              maxBoundsViscosity={1.0}
              style={{ width: "100%", height: "100%" }}
              whenReady={(e) => {
                const map = e.target;
                const b = map.getBounds();
                setBounds({
                  minLat: b.getSouth(),
                  maxLat: b.getNorth(),
                  minLng: b.getWest(),
                  maxLng: b.getEast(),
                  centerLat: map.getCenter().lat,
                  centerLng: map.getCenter().lng,
                });
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController flyTarget={flyTarget} onBoundsChange={setBounds} />
              <MapClickHandler
                active={isManualPinMode}
                onSelectLocation={handleSelectMapPoint}
              />

              {/* Radius Overlay Circle */}
              {selectedRadius && circleCenter && (
                <Circle
                  center={circleCenter}
                  radius={selectedRadius * 1000}
                  pathOptions={{
                    color: "#1e3a8a",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.12,
                    weight: 2,
                    dashArray: "6, 6",
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
                        <span>
                          {isGpsSource
                            ? "Your GPS location"
                            : "Your search point"}
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {isGpsSource
                          ? "High-Accuracy Browser GPS"
                          : "Selected Roxas reference location"}
                      </p>
                      <p className="text-[10px] font-mono text-gray-400 mt-1">
                        {userLocation[0].toFixed(5)},{" "}
                        {userLocation[1].toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Product Markers with Rich Popups */}
              {products.map((product) => {
                if (!product.latitude || !product.longitude) return null;
                const isHovered = hoveredId === product.id;
                const isSelected = selectedId === product.id;
                const distText = userLocation
                  ? formatDistance(
                      calculateDistance(
                        ...userLocation,
                        product.latitude,
                        product.longitude,
                      ),
                    )
                  : null;

                return (
                  <EquipmentMarker
                    key={product.id}
                    product={product}
                    active={isHovered || isSelected}
                    title={product.title}
                    alt={`Show ${product.title}, ₱${Number(product.price_per_day).toLocaleString("en-PH")} per day`}
                    zIndexOffset={isSelected || isHovered ? 1000 : 0}
                    eventHandlers={{
                      click: () => handleMarkerClick(product.id),
                    }}
                  >
                    <Popup>
                      <div className="w-52 pb-1 font-sans">
                        <div className="relative w-full h-28 overflow-hidden rounded-xl mb-2 bg-gray-100">
                          <img
                            src={
                              product.primary_image
                                ? product.primary_image.startsWith("http")
                                  ? product.primary_image
                                  : apiAssetUrl(product.primary_image)
                                : "/placeholder.svg"
                            }
                            className="w-full h-full object-cover"
                            alt={product.title}
                          />

                          <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {product.category}
                          </span>
                        </div>

                        <h4 className="font-bold text-gray-900 text-sm mb-1 leading-tight line-clamp-1">
                          {product.title}
                        </h4>

                        {/* Supplier Name */}
                        <p className="text-[11px] text-gray-600 mb-1">
                          Listed by:{" "}
                          <strong className="text-gray-900 font-semibold">
                            {product.supplier_name || "Local supplier"}
                          </strong>
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
                            {product.barangay
                              ? `Brgy. ${product.barangay}, Roxas, Oriental Mindoro`
                              : product.location || "Roxas, Oriental Mindoro"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-sm font-extrabold text-[#1e3a8a]">
                            ₱{product.price_per_day?.toLocaleString()}{" "}
                            <span className="text-[10px] font-normal text-gray-500">
                              /day
                            </span>
                          </span>
                        </div>

                        <Link
                          to={`/product/${product.id}`}
                          className="block w-full bg-[#1e3a8a] hover:bg-blue-800 text-white text-center py-2 rounded-xl text-xs font-semibold shadow-xs transition"
                        >
                          View Details
                        </Link>
                      </div>
                    </Popup>
                  </EquipmentMarker>
                );
              })}
            </MapContainer>

            {/* Floating Manual Pin Mode Guide Pill */}
            {isManualPinMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-amber-500 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg flex items-center gap-2 animate-bounce pointer-events-none">
                <Crosshair className="w-4 h-4" />
                <span>Click a point in Roxas to set your search location</span>
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
                      <span className="font-bold text-xs tracking-wide">
                        Location Inspector
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                        Live
                      </span>
                    </div>
                    <button
                      onClick={() => setIsInspectorMinimized((v) => !v)}
                      className="text-slate-400 hover:text-white p-1 transition cursor-pointer"
                      title={
                        isInspectorMinimized
                          ? "Expand inspector"
                          : "Minimize inspector"
                      }
                    >
                      {isInspectorMinimized ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {!isInspectorMinimized && (
                    <div className="space-y-2 text-[11px] pt-1">
                      {/* User GPS Coordinates */}
                      <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/50">
                        <div className="text-slate-400 font-medium flex items-center justify-between mb-1">
                          <span>User Coordinates:</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              isGpsSource
                                ? "bg-emerald-900/60 text-emerald-300"
                                : "bg-blue-900/60 text-blue-300"
                            }`}
                          >
                            {userLocation
                              ? isGpsSource
                                ? "GPS (High Accuracy)"
                                : "Manual Pin"
                              : "Not Set"}
                          </span>
                        </div>
                        <div className="font-mono text-emerald-400 font-bold">
                          {userLocation
                            ? `${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}`
                            : "Awaiting GPS prompt..."}
                        </div>
                      </div>

                      {/* Active/Target Equipment Coordinates */}
                      <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/50">
                        <div className="text-slate-400 font-medium truncate mb-1">
                          Equipment:{" "}
                          <span className="text-white font-semibold">
                            {activeProduct
                              ? activeProduct.title
                              : "None selected"}
                          </span>
                        </div>
                        {activeProduct ? (
                          <>
                            <div className="font-mono text-blue-400 font-bold mb-0.5">
                              {activeProduct.latitude && activeProduct.longitude
                                ? `${Number(activeProduct.latitude).toFixed(6)}, ${Number(activeProduct.longitude).toFixed(6)}`
                                : "No GPS calibrated"}
                            </div>
                            <div className="text-emerald-300 text-[10px] font-semibold truncate">
                              {activeProduct.barangay
                                ? `Brgy. ${activeProduct.barangay}, Roxas`
                                : "Roxas, Oriental Mindoro"}
                            </div>
                          </>
                        ) : (
                          <div className="text-slate-500 italic text-[10px]">
                            Hover or click a card/pin
                          </div>
                        )}
                      </div>

                      {/* Calculated Haversine Distance */}
                      <div className="bg-slate-800/80 rounded-xl p-2 border border-slate-700/50 flex items-center justify-between">
                        <span className="text-slate-400 font-medium">
                          Haversine Distance:
                        </span>
                        <span className="font-mono text-amber-300 font-extrabold text-xs">
                          {activeDistanceKm != null
                            ? `${activeDistanceKm.toFixed(3)} km (${Math.round(activeDistanceKm * 1000)} m)`
                            : "N/A (No Coords)"}
                        </span>
                      </div>

                      {/* Radius & Listings Count */}
                      <div className="flex items-center justify-between text-slate-400 text-[10px] px-1 pt-0.5">
                        <span>
                          Radius:{" "}
                          <strong className="text-white">
                            {selectedRadius ? `${selectedRadius} km` : "All"}
                          </strong>
                        </span>
                        <span>
                          Barangay:{" "}
                          <strong className="text-white">
                            {selectedBarangay || "All"}
                          </strong>
                        </span>
                        <span>
                          Listings:{" "}
                          <strong className="text-white">
                            {products.length}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
