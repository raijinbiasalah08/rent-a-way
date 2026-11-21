import { Car, Building2 } from "lucide-react";
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
  RotateCcw,
  Heart,
  ChevronLeft,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { getProducts } from "../../api/products";
import { useFavorites } from "../../context/FavoritesContext";
import { useCustomerLocation } from "../../context/CustomerLocationContext";
import { ROXAS_BARANGAYS } from "../../utils/roxasLocation";
import { apiAssetUrl } from "../../config";
import "./Browse.css";

const CATEGORIES = [
  ["", "All rentals", LayoutGrid],
  ["Cameras", "Cameras", Camera],
  ["Camping", "Camping", Tent],
  ["Sports", "Sports", Dumbbell],
  ["Event", "Events", Calendar],
  ["Household", "Household", Home],
  ["School", "School", GraduationCap],
  ["Vehicles", "Vehicles", Car],
  ["Apartments", "Apartments", Building2],
];
const PAGE_SIZE = 6;
const MARKETPLACE_FEATURES = [
  { icon: Search, label: "COMPARE LOCAL LISTINGS" },
  { icon: MessageSquare, label: "MESSAGE SUPPLIERS" },
  { icon: CalendarDays, label: "CHOOSE YOUR DATES" },
  { icon: MapPin, label: "RENTALS AROUND ROXAS" },
];
const STATUS = {
  available: ["Available", "available"],
  limited: ["Limited stock", "limited"],
  rented: ["Rented out", "unavailable"],
  maintenance: ["Maintenance", "unavailable"],
  unavailable: ["Unavailable", "unavailable"],
};

function getVisiblePages(page, totalPages) {
  if (totalPages <= 5)
    return Array.from({ length: totalPages }, (_, index) => ({
      number: index + 1,
    }));

  const visible = new Set([1, totalPages]);
  for (
    let number = Math.max(1, page - 1);
    number <= Math.min(totalPages, page + 1);
    number++
  ) {
    visible.add(number);
  }

  const sorted = [...visible].sort((a, b) => a - b);
  return sorted.flatMap((number, index) => {
    const previous = sorted[index - 1];
    return [
      ...(previous && number - previous > 1
        ? [{ ellipsis: true, key: `gap-${previous}-${number}` }]
        : []),
      { number },
    ];
  });
}

function ProductCard({ product, wide, dateQuery }) {
  const detailUrl = `/product/${product.id}${dateQuery}`;
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { getItemDistance } = useCustomerLocation();
  const favorite = favoriteIds.has(product.id);
  const distance = getItemDistance(product.latitude, product.longitude);
  const images = [
    ...new Set(
      (product.images || [])
        .map((image) => image.url)
        .filter(Boolean)
        .concat(product.primary_image || []),
    ),
  ];
  const [imageIndex, setImageIndex] = useState(0);
  const [galleryPaused, setGalleryPaused] = useState(false);
  const [status, tone] = STATUS[product.availability] || STATUS.unavailable;

  useEffect(() => {
    setImageIndex(0);
  }, [product.id]);

  useEffect(() => {
    if (
      images.length < 2 ||
      galleryPaused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return undefined;
    const timer = window.setInterval(() => {
      setImageIndex((index) => (index + 1) % images.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [galleryPaused, images.length]);

  const changeImage = (direction) => {
    setImageIndex((index) => (index + direction + images.length) % images.length);
  };
  return (
    <article
      className={`browse-product motion-card ${wide ? "browse-product-wide" : ""}`}
    >
      <div
        className="browse-product-gallery"
        onMouseEnter={() => setGalleryPaused(true)}
        onMouseLeave={() => setGalleryPaused(false)}
        onFocus={() => setGalleryPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setGalleryPaused(false);
        }}
      >
        <Link
          to={detailUrl}
          className="browse-product-image"
          aria-label={`View ${product.title}`}
        >
          <span
            className="browse-gallery-track"
            aria-hidden="true"
            style={{ transform: `translate3d(-${imageIndex * 100}%, 0, 0)` }}
          >
            {images.length ? (
              images.map((image) => (
                <img
                  key={image}
                  src={apiAssetUrl(image) || "/placeholder.svg"}
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    if (!event.currentTarget.src.endsWith("/placeholder.svg"))
                      event.currentTarget.src = "/placeholder.svg";
                  }}
                />
              ))
            ) : (
              <img src="/placeholder.svg" alt="" />
            )}
          </span>
        </Link>
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="browse-gallery-arrow previous"
              aria-label={`Previous photo of ${product.title}`}
              onClick={() => changeImage(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="browse-gallery-arrow next"
              aria-label={`Next photo of ${product.title}`}
              onClick={() => changeImage(1)}
            >
              <ChevronRight size={18} />
            </button>
            <span className="browse-gallery-count" aria-live="polite">
              {imageIndex + 1}/{images.length}
            </span>
          </>
        )}
      </div>
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
          <Link to={detailUrl}>{product.title}</Link>
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
          {product.supplier_badge && (
            <span className="browse-super">{product.supplier_badge}</span>
          )}
        </div>
        <div className="browse-product-bottom">
          <p>
            <strong>
              ₱{Number(product.price_per_day || 0).toLocaleString("en-PH")}
            </strong>
            <span> / day</span>
          </p>
          <Link className="browse-primary" to={detailUrl}>
            View rental <ArrowRight size={17} />
          </Link>
        </div>
      </div>
      <aside className="browse-hover-details" aria-label={`More information about ${product.title}`}>
        <div className="browse-hover-details-heading">
          <span>About this rental</span>
          <span>{product.category}</span>
        </div>
        <p className="browse-hover-description">
          {product.description?.trim() || "Contact the supplier to learn more about this rental."}
        </p>
        {product.specs?.trim() && (
          <p className="browse-hover-specs" title={product.specs}>
            <strong>Details:</strong> {product.specs}
          </p>
        )}
        <div className="browse-hover-terms">
          <span>Minimum: {product.min_days || 1} day{(product.min_days || 1) === 1 ? "" : "s"}</span>
          <span>Maximum: {product.max_days || 30} days</span>
          <span>{product.avg_rating > 0 ? `${Number(product.avg_rating).toFixed(1)} ★ item rating` : "Not reviewed yet"}</span>
        </div>
        <div className="browse-hover-supplier">
          {product.supplier_avatar ? (
            <img
              src={apiAssetUrl(product.supplier_avatar)}
              alt=""
              onError={(event) => { event.currentTarget.hidden = true; }}
            />
          ) : (
            <span className="browse-hover-supplier-initial" aria-hidden="true">
              {(product.supplier_name || "S").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span>
            <small>Listed by</small>
            <strong>{product.supplier_name || "Local supplier"}</strong>
          </span>
          <Link to={detailUrl} className="browse-hover-view">View listing <ArrowRight size={14} /></Link>
        </div>
      </aside>
    </article>
  );
}

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryKey = searchParams.toString();
  const start = searchParams.get("startDate");
  const end = searchParams.get("endDate");
  const dateQuery =
    start && end
      ? "?" + new URLSearchParams({ start_date: start, end_date: end })
      : "";
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
  const budgetPanel = useRef(null);
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
      limit: PAGE_SIZE,
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
      setFiltersOpen(true);
      if (budgetPanel.current) budgetPanel.current.open = true;
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
    if (budgetPanel.current) budgetPanel.current.open = false;
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
    setFiltersOpen(true);
    requestAnimationFrame(() => dateStart.current?.focus());
  }
  const hasFilters = [...searchParams.keys()].some(
    (key) => key !== "page" && searchParams.get(key),
  );
  const dateLabel =
    draft.startDate && draft.endDate
      ? `${draft.startDate} – ${draft.endDate}`
      : "Select dates";
  const visiblePages = getVisiblePages(page, totalPages);
  const firstResult = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="browse-page browse-layout-b">
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
        <header className="browse-intro">
          <h1>Browse rentals</h1>
          <p className="browse-intro-copy">
            Equipment, vehicles and apartments in Roxas.
          </p>
        </header>
        <form
          id="browse-search"
          onSubmit={submit}
          className={`browse-search-bar ${filtersOpen ? "filters-expanded" : ""}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              const panel = e.target.closest("details[open]");
              if (panel) {
                panel.open = false;
                panel.querySelector("summary")?.focus();
              }
            }
          }}
          onInvalid={() => {
            setFiltersOpen(true);
            if (budgetPanel.current) budgetPanel.current.open = true;
          }}
          aria-label="Search rentals"
        >
          <label className="browse-search-field">
            <Search size={22} aria-hidden="true" />
            <span className="sr-only">Search rentals</span>
            <input
              value={draft.q}
              onChange={(e) => change("q", e.target.value)}
              placeholder="Search rentals…"
              maxLength={200}
            />
          </label>
          <label id="browse-location-filter" className="browse-location-field">
            <MapPin size={22} aria-hidden="true" />
            <span>
              <span className="browse-field-label">Location</span>
              <select
                aria-label="Search location"
                value={draft.barangay}
                onChange={(e) => change("barangay", e.target.value)}
              >
                <option value="">All barangays</option>
                {ROXAS_BARANGAYS.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}, Roxas
                  </option>
                ))}
              </select>
            </span>
          </label>
          <details
            id="browse-date-filter"
            ref={datePanel}
            className="browse-date-picker"
          >
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
          <details
            id="browse-budget-filter"
            ref={budgetPanel}
            className="browse-budget-picker"
          >
            <summary>
              <SlidersHorizontal size={18} />
              Daily budget
            </summary>
            <div className="browse-budget-panel">
              {" "}
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
              <button type="submit" className="browse-primary">
                Apply budget
              </button>
            </div>
          </details>
          <button
            type="button"
            className="browse-mobile-filter-toggle browse-secondary"
            aria-expanded={filtersOpen}
            aria-controls="browse-location-filter browse-date-filter browse-budget-filter"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={16} />
            {filtersOpen ? "Hide filters" : "Filters"}
          </button>
          <button className="browse-primary browse-search-submit" type="submit">
            Search <ArrowRight size={17} className="sm:hidden" />
          </button>
        </form>
        {validation && (
          <p className="browse-validation" role="alert">
            {validation}
          </p>
        )}
        <nav className="browse-categories" aria-label="Rental categories">
          {CATEGORIES.map(([value, label, Icon]) => (
            <button
              type="button"
              key={label}
              aria-pressed={category === value}
              onClick={() => updateParam("category", value)}
              className={category === value ? "is-active" : ""}
            >
              {value ? (
                <img
                  src={`/category-icons/${{ Cameras: "camera", Camping: "mountain", Sports: "bicycle", Event: "calendar", Household: "wrench", School: "book", Vehicles: "car", Apartments: "apartment" }[value]}.png`}
                  alt=""
                  width="36"
                  height="36"
                />
              ) : (
                <Icon size={23} aria-hidden="true" />
              )}
              {label}
            </button>
          ))}
        </nav>
        <div className="browse-body">
          <section className="browse-results" aria-label="Rental results">
            <div className="browse-results-heading">
              <div>
                <h2 className="sr-only">Rental results</h2>
                <p role="status" aria-live="polite">
                  {loading
                    ? "Finding rentals…"
                    : error
                      ? "Rentals unavailable"
                      : total
                        ? `Showing ${firstResult}–${lastResult} of ${total} rentals`
                        : "0 rentals"}
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
              {hasFilters && (
                <button onClick={reset}>
                  <RotateCcw size={14} />
                  Reset filters
                </button>
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
                    ? "No rentals match your search"
                    : "New rentals are on the way"}
                </h3>
                <p>
                  {hasFilters
                    ? "Try a different category, location, or date range to find your next rental."
                    : "Local suppliers haven't added rentals here yet. Check back soon."}
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
                    dateQuery={dateQuery}
                    key={product.id}
                    product={product}
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
                <div className="browse-page-numbers" aria-label="Page numbers">
                  {visiblePages.map((item) =>
                    item.ellipsis ? (
                      <span
                        key={item.key}
                        className="browse-page-ellipsis"
                        aria-hidden="true"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item.number}
                        type="button"
                        aria-label={`Page ${item.number}`}
                        aria-current={page === item.number ? "page" : undefined}
                        onClick={() => updateParam("page", item.number)}
                      >
                        {item.number}
                      </button>
                    ),
                  )}
                </div>
                <button
                  aria-label="Next page"
                  disabled={page >= totalPages}
                  onClick={() => updateParam("page", page + 1)}
                >
                  <ChevronRight size={18} />
                </button>
                <span className="browse-pagination-summary">
                  Page {page} of {totalPages}
                </span>
              </nav>
            )}
          </section>
        </div>
      </div>
      <div
        className="browse-feature-ticker"
        role="region"
        aria-label="Rent-A-Way marketplace features"
      >
        <p className="sr-only">
          Compare local listings. Message suppliers. Choose your dates. Rentals
          around Roxas.
        </p>
        <div className="animate-marquee" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee-group">
              {MARKETPLACE_FEATURES.map(({ icon: Icon, label }) => (
                <span key={label}>
                  <Icon size={16} aria-hidden="true" />
                  {label}
                  <span className="browse-feature-dot">●</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
