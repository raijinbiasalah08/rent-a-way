import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search,
  MapPin,
  CalendarDays,
  ArrowRight,
  Star,
  ChevronRight,
  SlidersHorizontal,
  X,
  Navigation,
  LayoutGrid,
  Camera,
  Tent,
  Dumbbell,
  Calendar,
  Home,
  GraduationCap,
  Compass,
  RotateCcw,
  Heart,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import { getProducts } from "../../api/products";
import { useFavorites } from "../../context/FavoritesContext";
import { useCustomerLocation } from "../../context/CustomerLocationContext";
import { ROXAS_BARANGAYS } from "../../utils/roxasLocation";
import { apiAssetUrl } from "../../config";
import "./Browse.css";

const CATEGORIES = [
  ["", "All equipment", LayoutGrid],
  ["Cameras", "Cameras", Camera],
  ["Camping", "Camping", Tent],
  ["Sports", "Sports", Dumbbell],
  ["Event", "Events", Calendar],
  ["Household", "Household", Home],
  ["School", "School", GraduationCap],
];
const STATUS = {
  available: ["Available", "available"],
  limited: ["Limited stock", "limited"],
  rented: ["Rented out", "unavailable"],
  maintenance: ["Maintenance", "unavailable"],
  unavailable: ["Unavailable", "unavailable"],
};
function ProductCard({ product, wide }) {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { getItemDistance } = useCustomerLocation();
  const favorite = favoriteIds.has(product.id);
  const distance = getItemDistance(product.latitude, product.longitude);
  const [status, tone] = STATUS[product.availability] || STATUS.unavailable;
  return (
    <article className={`browse-product ${wide ? "browse-product-wide" : ""}`}>
      <Link
        to={`/product/${product.id}`}
        className="browse-product-image"
        aria-label={`View ${product.title}`}
      >
        <img
          src={apiAssetUrl(product.primary_image) || "/placeholder.svg"}
          alt={product.title}
          loading="lazy"
          onError={(e) => {
            if (!e.currentTarget.src.endsWith("/placeholder.svg"))
              e.currentTarget.src = "/placeholder.svg";
          }}
        />
      </Link>
      <div className="browse-product-content">
        <div className="browse-product-meta">
          <span className="browse-category-label">{product.category}</span>
          <span className={`browse-status ${tone}`}>
            <span />
            {status}
          </span>
          <button
            className={`browse-save ${favorite ? "is-saved" : ""}`}
            aria-label={`${favorite ? "Remove" : "Save"} ${product.title} ${favorite ? "from" : "to"} favorites`}
            aria-pressed={favorite}
            onClick={() => toggleFavorite(product.id)}
          >
            <Heart size={20} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
        <h3>
          <Link to={`/product/${product.id}`}>{product.title}</Link>
        </h3>
        <p className="browse-description">
          {product.description ||
            "See equipment details and arrange your next rental."}
        </p>
        <div className="browse-location-row">
          <span>
            <MapPin size={15} className="text-rose-500" />
            {product.barangay
              ? `${product.barangay}, Roxas`
              : product.location || "Roxas, Oriental Mindoro"}
          </span>
          {distance && (
            <span className="browse-distance">
              <Navigation size={13} />
              {distance}
            </span>
          )}
          <span>
            <CalendarDays size={15} />
            Min. {product.min_days || 1}{" "}
            {(product.min_days || 1) === 1 ? "day" : "days"}
          </span>
        </div>
        <div className="browse-review">
          {Number(product.avg_rating) > 0 ? (
            <>
              <Star size={14} className="text-amber-500" fill="currentColor" />
              {Number(product.avg_rating).toFixed(1)} rating
            </>
          ) : (
            "No reviews yet"
          )}
          {!!product.is_super_supplier && (
            <span className="browse-super">Super supplier</span>
          )}
        </div>
        <div className="browse-product-bottom">
          <p>
            <strong>
              ₱{Number(product.price_per_day || 0).toLocaleString("en-PH")}
            </strong>
            <span> / day</span>
          </p>
          <Link className="browse-primary" to={`/product/${product.id}`}>
            View equipment <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryKey = searchParams.toString();
  const category = searchParams.get("category") || "";
  const availableOnly = searchParams.get("availability") === "available";
  const page = Math.max(1, Number.parseInt(searchParams.get("page"), 10) || 1);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [validation, setValidation] = useState("");
  const [draft, setDraft] = useState({
    q: "",
    barangay: "",
    minPrice: "",
    maxPrice: "",
    startDate: "",
    endDate: "",
  });
  const datePanel = useRef(null);
  const dateStart = useRef(null);
  const { detecting, requestCustomerLocation, isGpsInsideRoxas } =
    useCustomerLocation();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
  }).format(new Date());
  const mapParams = new URLSearchParams();
  if (category) mapParams.set("category", category);
  if (searchParams.get("barangay"))
    mapParams.set("barangay", searchParams.get("barangay"));
  const mapUrl = `/map${mapParams.size ? `?${mapParams}` : ""}`;

  useEffect(() => {
    const params = new URLSearchParams(queryKey);
    const legacyPrice = (params.get("price") || "").split("-");
    setDraft({
      q: params.get("q") || "",
      barangay: params.get("barangay") || "",
      minPrice: params.get("minPrice") ?? legacyPrice[0] ?? "",
      maxPrice: params.get("maxPrice") ?? legacyPrice[1] ?? "",
      startDate: params.get("startDate") || "",
      endDate: params.get("endDate") || "",
    });
    setValidation("");
  }, [queryKey]);

  useEffect(() => {
    let current = true;
    const params = new URLSearchParams(queryKey);
    const legacyPrice = (params.get("price") || "").split("-");
    const apiParams = {
      page,
      limit: 12,
      search: params.get("q") || undefined,
      category: params.get("category") || undefined,
      barangay: params.get("barangay") || undefined,
      minPrice: params.get("minPrice") ?? (legacyPrice[0] || undefined),
      maxPrice: params.get("maxPrice") ?? (legacyPrice[1] || undefined),
      availability: params.get("availability") || undefined,
      startDate: params.get("startDate") || undefined,
      endDate: params.get("endDate") || undefined,
    };
    setLoading(true);
    setError("");
    getProducts(apiParams)
      .then((res) => {
        if (!current) return;
        setProducts(res.data.data.products || []);
        setTotal(res.data.data.total || 0);
        setTotalPages(res.data.data.totalPages || 1);
      })
      .catch((e) => {
        if (current)
          setError(
            e.response?.data?.message ||
              "We couldn't load equipment. Please try again.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [queryKey, page, attempt]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value !== "") next.set(key, String(value));
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
  }
  function submit(e) {
    e.preventDefault();
    if (
      draft.minPrice &&
      draft.maxPrice &&
      Number(draft.minPrice) > Number(draft.maxPrice)
    ) {
      setValidation("Maximum price must be at least the minimum price.");
      return;
    }
    if (
      (draft.startDate || draft.endDate) &&
      (!draft.startDate ||
        !draft.endDate ||
        draft.endDate <= draft.startDate ||
        draft.startDate < today)
    ) {
      setValidation("Choose a start date from today and an end date after it.");
      openDates();
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("price");
    Object.entries(draft).forEach(([key, value]) =>
      value.trim() ? next.set(key, value.trim()) : next.delete(key),
    );
    next.set("page", "1");
    setSearchParams(next);
    setValidation("");
    setFiltersOpen(false);
    if (datePanel.current) datePanel.current.open = false;
  }
  function reset() {
    setSearchParams({});
    setDraft({
      q: "",
      barangay: "",
      minPrice: "",
      maxPrice: "",
      startDate: "",
      endDate: "",
    });
    setValidation("");
  }
  function change(key, value) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  function openDates() {
    if (datePanel.current) datePanel.current.open = true;
    dateStart.current?.focus();
  }
  const hasFilters = [...searchParams.keys()].some(
    (key) => key !== "page" && searchParams.get(key),
  );
  const dateLabel =
    draft.startDate && draft.endDate
      ? `${draft.startDate} – ${draft.endDate}`
      : "Select dates";

  return (
    <div className="browse-page">
      <Helmet>
        <title>
          {category ? `${category} Rentals` : "Browse Rentals"} | Rent-A-Way
        </title>
        <meta
          name="description"
          content="Find equipment for your next project, adventure, or event in Roxas, Oriental Mindoro."
        />
      </Helmet>
      <div className="browse-container">
        <nav className="browse-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={14} />
          <span aria-current="page">Browse equipment</span>
        </nav>
        <header className="browse-intro">
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="browse-watermark"
          />
          <p className="browse-eyebrow">Rent local. Do more.</p>
          <h1>Find the right gear, nearby.</h1>
          <p className="browse-intro-copy">
            Equipment for your next project, adventure, or event in Roxas.
          </p>
        </header>
        <form
          id="browse-search"
          onSubmit={submit}
          className="browse-search-bar"
          aria-label="Search equipment"
        >
          <label className="browse-search-field">
            <Search size={22} aria-hidden="true" />
            <span className="sr-only">Search equipment</span>
            <input
              value={draft.q}
              onChange={(e) => change("q", e.target.value)}
              placeholder="Search equipment…"
              maxLength={200}
            />
          </label>
          <label className="browse-location-field">
            <MapPin size={22} aria-hidden="true" />
            <span>
              <span className="browse-field-label">Location</span>
              <select
                aria-label="Search location"
                value={draft.barangay}
                onChange={(e) => change("barangay", e.target.value)}
              >
                <option value="">Roxas, Oriental Mindoro</option>
                {ROXAS_BARANGAYS.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}, Roxas
                  </option>
                ))}
              </select>
            </span>
          </label>
          <details ref={datePanel} className="browse-date-picker">
            <summary>
              <CalendarDays size={22} />
              <span>
                <span className="browse-field-label">Rental dates</span>
                <span className="browse-date-label">{dateLabel}</span>
              </span>
            </summary>
            <div className="browse-date-panel">
              <label>
                Start date
                <input
                  ref={dateStart}
                  type="date"
                  min={today}
                  value={draft.startDate}
                  onChange={(e) => change("startDate", e.target.value)}
                />
              </label>
              <label>
                End date
                <input
                  type="date"
                  min={draft.startDate || today}
                  value={draft.endDate}
                  onChange={(e) => change("endDate", e.target.value)}
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    change("startDate", "");
                    change("endDate", "");
                  }}
                >
                  Clear dates
                </button>
                <button type="submit" className="browse-primary">
                  Apply dates
                </button>
              </div>
            </div>
          </details>
          <button className="browse-primary browse-search-submit" type="submit">
            Search <ArrowRight size={17} className="sm:hidden" />
          </button>
        </form>
        {validation && (
          <p className="browse-validation" role="alert">
            {validation}
          </p>
        )}
        <nav className="browse-categories" aria-label="Equipment categories">
          {CATEGORIES.map(([value, label, Icon]) => (
            <button
              type="button"
              key={label}
              aria-pressed={category === value}
              onClick={() => updateParam("category", value)}
              className={category === value ? "is-active" : ""}
            >
              <Icon size={23} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <div className="browse-body">
          <div className="browse-mobile-filters">
            <button
              className="browse-secondary"
              aria-expanded={filtersOpen}
              aria-controls="browse-filters"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal size={18} />
              Filters
              {filtersOpen ? <X size={16} /> : <ChevronRight size={16} />}
            </button>
            {hasFilters && (
              <button onClick={reset} className="text-sm text-blue-800">
                Reset filters
              </button>
            )}
          </div>
          <aside
            id="browse-filters"
            className={`browse-filters ${filtersOpen ? "is-open" : ""}`}
            aria-label="Rental filters"
          >
            <div className="browse-filter-heading">
              <h2>Filters</h2>
              <button onClick={reset}>
                <RotateCcw size={14} />
                Reset
              </button>
            </div>
            <label className="browse-filter-label">
              Barangay
              <select
                form="browse-search"
                value={draft.barangay}
                onChange={(e) => change("barangay", e.target.value)}
              >
                <option value="">All barangays</option>
                {ROXAS_BARANGAYS.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="browse-filter-label">Daily budget</legend>
              <div className="browse-budget">
                <label>
                  <span className="sr-only">Minimum daily price</span>
                  <input
                    form="browse-search"
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    placeholder="₱ Min"
                    value={draft.minPrice}
                    onChange={(e) => change("minPrice", e.target.value)}
                  />
                </label>
                <span>–</span>
                <label>
                  <span className="sr-only">Maximum daily price</span>
                  <input
                    form="browse-search"
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    placeholder="₱ Max"
                    value={draft.maxPrice}
                    onChange={(e) => change("maxPrice", e.target.value)}
                  />
                </label>
              </div>
            </fieldset>
            <div>
              <p className="browse-filter-label">Rental dates</p>
              <button className="browse-date-shortcut" onClick={openDates}>
                <CalendarDays size={17} />
                <span>{dateLabel}</span>
              </button>
            </div>
            <label className="browse-availability">
              <span>Available only</span>
              <input
                type="checkbox"
                role="switch"
                checked={availableOnly}
                onChange={(e) =>
                  updateParam(
                    "availability",
                    e.target.checked ? "available" : "",
                  )
                }
              />
              <span className="browse-switch" aria-hidden="true" />
            </label>
            <button
              type="submit"
              form="browse-search"
              className="browse-primary w-full"
            >
              Apply filters
            </button>
            <p className="browse-filter-note">
              Choose dates to check availability for your rental period.
            </p>
          </aside>
          <section className="browse-results" aria-label="Equipment results">
            <div className="browse-results-heading">
              <div>
                <h2>
                  {availableOnly ? "Available near you" : "Equipment near you"}
                </h2>
                <p role="status" aria-live="polite">
                  {loading
                    ? "Finding equipment…"
                    : error
                      ? "Equipment unavailable"
                      : `${total} ${total === 1 ? "result" : "results"}${totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}`}
                </p>
              </div>
              <div className="browse-view-toggle">
                <span aria-current="page">
                  <LayoutGrid size={16} />
                  Grid
                </span>
                <Link to={mapUrl}>
                  <MapPin size={16} />
                  Map
                </Link>
              </div>
            </div>
            <div className="browse-results-tools">
              {hasFilters ? (
                <button onClick={reset}>
                  <X size={14} />
                  Clear active filters
                </button>
              ) : (
                <span>Discover equipment from local suppliers</span>
              )}
              <button
                disabled={detecting}
                onClick={() => requestCustomerLocation(false).catch(() => {})}
              >
                <Navigation size={14} />
                {detecting
                  ? "Locating…"
                  : isGpsInsideRoxas
                    ? "Update my location"
                    : "Use my location"}
              </button>
            </div>
            {loading ? (
              <div className="browse-loading" role="status">
                <span className="sr-only">Loading equipment</span>
                {[1, 2].map((n) => (
                  <div key={n} className="browse-skeleton animate-pulse">
                    <div />
                    <div>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="browse-empty" role="alert">
                <AlertCircle size={32} />
                <h3>Let's try that again</h3>
                <p>{error}</p>
                <button
                  className="browse-primary"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  Retry
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="browse-empty">
                <Search size={32} />
                <h3>
                  {hasFilters
                    ? "No equipment matches your search"
                    : "New rentals are on the way"}
                </h3>
                <p>
                  {hasFilters
                    ? "Try a different category, location, or date range to find your next rental."
                    : "Local suppliers haven't listed equipment here yet. Check back soon."}
                </p>
                {hasFilters ? (
                  <button className="browse-primary" onClick={reset}>
                    Clear all filters
                  </button>
                ) : (
                  <Link className="browse-primary" to="/for-suppliers">
                    Become a supplier <ArrowRight size={17} />
                  </Link>
                )}
              </div>
            ) : (
              <div
                className={`browse-product-grid ${products.length === 1 ? "single-result" : ""}`}
              >
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    wide={products.length === 1}
                  />
                ))}
              </div>
            )}
            {!loading && !error && totalPages > 1 && (
              <nav className="browse-pagination" aria-label="Results pages">
                <button
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => updateParam("page", page - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  aria-label="Next page"
                  disabled={page >= totalPages}
                  onClick={() => updateParam("page", page + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </nav>
            )}
            <div className="browse-explore">
              <Compass size={30} />
              <div>
                <h3>Looking for something else?</h3>
                <p>Try another category or explore the map.</p>
              </div>
              <Link to={mapUrl}>
                Explore map <ArrowRight size={18} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
