import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search,
  Shield,
  Check,
  Camera,
  Mountain,
  Bike,
  Calendar,
  Wrench,
  BookOpen,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  RotateCcw,
  MessageSquare,
  Navigation,
  Compass,
} from "lucide-react";
import { getProducts, getCategories } from "../../api/products";
import api from "../../api/axios";
import { useFavorites } from "../../context/FavoritesContext";
import { useCustomerLocation } from "../../context/CustomerLocationContext";
import { apiAssetUrl } from "../../config";

/* ─── Category data ─────────────────────────────────────────── */
const CATEGORIES = [
  {
    id: "Cameras",
    name: "Cameras & Drones",
    subtitle: "Capture every moment",
    to: "/browse?category=Cameras",
    icon: Camera,
    bg: "bg-teal-50",
    iconColor: "text-teal-600",
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&q=85&fit=crop",
  },
  {
    id: "Camping",
    name: "Camping Equipment",
    subtitle: "Gear for the great outdoors",
    to: "/browse?category=Camping",
    icon: Mountain,
    bg: "bg-green-50",
    iconColor: "text-green-600",
    image:
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=700&q=85&fit=crop",
  },
  {
    id: "Sports",
    name: "Sports Equipment",
    subtitle: "Play harder, spend less",
    to: "/browse?category=Sports",
    icon: Bike,
    bg: "bg-orange-50",
    iconColor: "text-orange-600",
    image:
      "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=700&q=85&fit=crop",
  },
  {
    id: "Event",
    name: "Event Equipment",
    subtitle: "Everything for the big day",
    to: "/browse?category=Event",
    icon: Calendar,
    bg: "bg-purple-50",
    iconColor: "text-purple-600",
    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=700&q=85&fit=crop",
  },
  {
    id: "Household",
    name: "Household Equipment",
    subtitle: "Tools for every project",
    to: "/browse?category=Household",
    icon: Wrench,
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
    image:
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=700&q=85&fit=crop",
  },
  {
    id: "School",
    name: "School Project Equipment",
    subtitle: "Ace every project",
    to: "/browse?category=School",
    icon: BookOpen,
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
    image:
      "https://images.unsplash.com/photo-1532094349884-543290200b6b?w=700&q=85&fit=crop",
  },
];

/* ─── Ticker items ───────────────────────────────────────────── */
const TICKER = [
  { icon: Search, label: "COMPARE LOCAL LISTINGS" },
  { icon: MessageSquare, label: "MESSAGE SUPPLIERS" },
  { icon: Calendar, label: "CHOOSE YOUR DATES" },
  { icon: MapPin, label: "RENTALS AROUND ROXAS" },
];

const AVAILABILITY_STYLES = {
  available: "bg-emerald-50 text-emerald-700",
  limited: "bg-amber-50 text-amber-700",
  rented: "bg-slate-100 text-slate-600",
  maintenance: "bg-orange-50 text-orange-700",
  unavailable: "bg-slate-100 text-slate-600",
};

/* ─── Stars helper ───────────────────────────────────────────── */
function Stars({ rating }) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${Number(rating).toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "text-amber-400" : "text-gray-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ─── Product listing card ───────────────────────────────────── */
function ListingCard({ product }) {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { getItemDistance } = useCustomerLocation();
  const isFavorite = favoriteIds?.has(product.id);

  const name = product.title || product.name || "Unnamed Product";
  const category = (
    product.category ||
    product.category_name ||
    ""
  ).toUpperCase();
  const rating = product.avg_rating || product.rating || null;
  const price = product.price_per_day || product.price || 0;
  const location = product.barangay
    ? `${product.barangay}, Roxas`
    : product.location || "Roxas, Oriental Mindoro";
  const distanceText = getItemDistance(product.latitude, product.longitude);
  const availabilityClass = AVAILABILITY_STYLES[product.availability];
  const minDays = Number(product.min_days) || 1;
  const image = product.primary_image
    ? apiAssetUrl(product.primary_image)
    : "/placeholder.svg";

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow group flex flex-col">
      <div className="relative h-56 bg-[#f5f0e8] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          onError={(event) => {
            if (!event.currentTarget.src.endsWith("/placeholder.svg"))
              event.currentTarget.src = "/placeholder.svg";
          }}
        />

        <div className="absolute top-3 left-3 flex gap-2">
          {product.popular && (
            <span className="bg-[#1e3a8a] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              Popular
            </span>
          )}
          {availabilityClass && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${availabilityClass}`}
            >
              {product.availability === "limited"
                ? "Limited"
                : product.availability === "rented"
                  ? "Rented out"
                  : product.availability === "maintenance"
                    ? "In maintenance"
                    : product.availability === "unavailable"
                      ? "Unavailable"
                      : "Available"}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition"
          aria-label={`${isFavorite ? "Remove" : "Add"} ${name} ${isFavorite ? "from" : "to"} saved gear`}
          aria-pressed={Boolean(isFavorite)}
        >
          <svg
            className={`w-4 h-4 ${isFavorite ? "text-red-500 fill-current" : "text-gray-400"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-gray-400 tracking-widest">
            {category}
          </span>
          {rating ? (
            <div className="flex items-center gap-1">
              <Stars rating={rating} />
              <span className="text-xs font-semibold text-gray-700">
                {Number(rating).toFixed(1)}
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
              No reviews yet
            </span>
          )}
        </div>

        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">
          {name}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
          {product.description || "View the listing for equipment details."}
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 flex-wrap">
          <span className="flex items-center gap-1" title={location}>
            <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
            {location}
          </span>
          {distanceText && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
              <Navigation className="w-2.5 h-2.5" />
              {distanceText}
            </span>
          )}
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Min {minDays} {minDays === 1 ? "day" : "days"}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl font-extrabold text-gray-900">
              ₱{Number(price).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">per day</div>
          </div>
          <Link
            to={`/product/${product.id}`}
            className="flex items-center gap-1 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition"
          >
            View <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All categories");
  const [products, setProducts] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listingsError, setListingsError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [platformStats, setPlatformStats] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([getProducts({ limit: 6 }), getCategories()])
      .then(([productsResult, categoriesResult]) => {
        if (productsResult.status === "fulfilled") {
          setProducts(productsResult.value.data?.data?.products || []);
          setListingsError(false);
        } else {
          setListingsError(true);
        }
        if (categoriesResult.status === "fulfilled") {
          setCategoryCounts(categoriesResult.value.data?.data || []);
        }
      })
      .finally(() => setLoading(false));
  }, [loadAttempt]);

  // Fetch real platform stats for the hero stats strip
  useEffect(() => {
    api
      .get("/admin/public-stats")
      .then((res) => setPlatformStats(res.data?.data || null))
      .catch(() => setPlatformStats(null));
  }, []);

  // Render exact live counts without implying the numbers are estimates.
  const fmt = (n) => (n != null ? n.toLocaleString() : "—");
  const fmtRating = (r) => (r != null ? `${r}/5` : "—");

  const LIVE_STATS = [
    { num: fmt(platformStats?.totalProducts), label: "Items available" },
    { num: fmt(platformStats?.totalSuppliers), label: "Active suppliers" },
    { num: fmtRating(platformStats?.avgRating), label: "Average rating" },
    { num: fmt(platformStats?.completedRentals), label: "Rentals completed" },
  ];

  const displayProducts = products;
  const heroProduct = displayProducts[0];
  const browseParams = new URLSearchParams();
  if (search.trim()) browseParams.set("q", search.trim());
  if (selectedCategory !== "All categories")
    browseParams.set("category", selectedCategory);
  const browseQuery = browseParams.toString();
  const browseUrl = `/browse${browseQuery ? `?${browseQuery}` : ""}`;

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(browseUrl);
  };

  return (
    <div className="font-sans">
      <Helmet>
        <title>Rent-A-Way | Rent what you need. Save what you don't.</title>
        <meta
          name="description"
          content="Find cameras, camping gear, sports, event, household, and school equipment to rent from local suppliers in Roxas, Oriental Mindoro. Compare listings and send a rental request."
        />
      </Helmet>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0f1729] text-white">
        <div className="pointer-events-none absolute -left-40 -top-32 h-96 w-96 rounded-full bg-blue-700/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 top-12 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8">
          <div className="grid items-center gap-10 md:grid-cols-[1.05fr_.95fr] lg:gap-14">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-blue-100">
                <MapPin className="h-4 w-4 text-amber-400" />
                Local rentals in Roxas, Oriental Mindoro
              </div>

              <h1 className="mb-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Get the gear.
                <br />
                <span className="text-amber-400">Skip the cost.</span>
              </h1>
              <p className="mb-7 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Find equipment from local suppliers for your next project,
                celebration, or weekend outdoors. Choose your dates and send a
                rental request when you find what you need.
              </p>

              <form
                role="search"
                aria-label="Search rental equipment"
                onSubmit={submitSearch}
                className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white p-2 shadow-2xl sm:grid-cols-[minmax(0,1fr)_minmax(170px,.8fr)] lg:grid-cols-[minmax(0,1fr)_180px_auto]"
              >
                <label className="flex min-w-0 items-center gap-2 rounded-xl px-3 focus-within:ring-2 focus-within:ring-blue-500 sm:col-span-1">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="sr-only">What do you need to rent?</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search equipment…"
                    className="h-12 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
                  />
                </label>
                <label className="sr-only" htmlFor="home-category">
                  Equipment category
                </label>
                <select
                  id="home-category"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="h-12 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="All categories">All categories</option>
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] px-5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:col-span-2 lg:col-span-1"
                >
                  Find rentals <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Compare local listings
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Message suppliers
                </span>
              </div>

              <Link
                to={heroProduct ? `/product/${heroProduct.id}` : "/browse"}
                className="group relative mt-6 flex h-44 w-full max-w-xl items-end overflow-hidden rounded-2xl border border-white/10 bg-slate-800 shadow-lg md:hidden"
              >
                <img
                  src={
                    heroProduct?.primary_image
                      ? apiAssetUrl(heroProduct.primary_image)
                      : CATEGORIES[0].image
                  }
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  onError={(event) => {
                    if (!event.currentTarget.src.endsWith("/placeholder.svg"))
                      event.currentTarget.src = "/placeholder.svg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/15 to-transparent" />
                <div className="relative w-full p-4">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[.14em] text-blue-200">
                    {heroProduct
                      ? "Recently listed"
                      : "Explore the marketplace"}
                  </span>
                  <span className="block truncate text-lg font-bold text-white">
                    {heroProduct?.title || "Find equipment for your plans"}
                  </span>
                  {heroProduct && (
                    <span className="mt-1 block text-sm font-semibold text-white">
                      ₱
                      {Number(heroProduct.price_per_day || 0).toLocaleString(
                        "en-PH",
                      )}
                      <span className="ml-1 font-normal text-slate-300">
                        / day
                      </span>
                    </span>
                  )}
                </div>
              </Link>

              <div className="mt-6 flex flex-wrap gap-2">
                {CATEGORIES.slice(0, 3).map((category) => (
                  <Link
                    key={category.id}
                    to={category.to}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative mx-auto hidden aspect-[1.12] w-full max-w-[520px] grid-cols-[1.15fr_.85fr] grid-rows-2 gap-3 md:grid">
              <Link
                to={heroProduct ? `/product/${heroProduct.id}` : "/browse"}
                className="group relative row-span-2 min-h-[320px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-800 shadow-2xl"
              >
                <img
                  src={
                    heroProduct?.primary_image
                      ? apiAssetUrl(heroProduct.primary_image)
                      : CATEGORIES[0].image
                  }
                  alt={heroProduct?.title || "Camera available to rent"}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  onError={(event) => {
                    if (!event.currentTarget.src.endsWith("/placeholder.svg"))
                      event.currentTarget.src = "/placeholder.svg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/5 to-slate-950/20" />
                <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-900 shadow-lg">
                  {heroProduct ? "Recently listed" : "Explore cameras & drones"}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[.16em] text-blue-200">
                    {heroProduct?.category || "Roxas rental marketplace"}
                  </p>
                  <h2 className="line-clamp-2 text-xl font-bold text-white sm:text-2xl">
                    {heroProduct?.title || "Find the right gear for your plans"}
                  </h2>
                  {heroProduct && (
                    <p className="mt-2 text-sm font-semibold text-white">
                      ₱
                      {Number(heroProduct.price_per_day || 0).toLocaleString(
                        "en-PH",
                      )}
                      <span className="ml-1 font-normal text-slate-300">
                        / day
                      </span>
                    </p>
                  )}
                </div>
              </Link>

              {CATEGORIES.slice(1, 3).map((category) => (
                <Link
                  key={category.id}
                  to={category.to}
                  className="group relative min-h-0 overflow-hidden rounded-[24px] border border-white/10 bg-slate-800 shadow-xl"
                >
                  <img
                    src={category.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/10" />
                  <span className="absolute inset-x-4 bottom-4 text-sm font-semibold text-white">
                    {category.name}
                  </span>
                </Link>
              ))}

              <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-xl">
                <Compass className="h-4 w-4 text-[#1e3a8a]" />
                Browse rentals around Roxas
              </div>
            </div>
          </div>
        </div>

        {/* Live marketplace figures */}
        <div className="relative border-t border-white/10 bg-white/[.025]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 py-6 sm:px-6 sm:py-7 md:grid-cols-4 lg:px-8">
            {LIVE_STATS.map((s) => (
              <div key={s.label} className="text-center md:text-left">
                <div className="text-2xl font-extrabold text-amber-400 transition-all duration-500 sm:text-3xl">
                  {s.num}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TICKER STRIP ────────────────────────────────────────── */}
      <div className="border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
          {TICKER.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide text-slate-600 sm:text-xs"
            >
              <item.icon className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES ──────────────────────────────────────────── */}
      <section className="bg-[#f5f0e8] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-0.5 bg-amber-500" />
                <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">
                  Rent by Category
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight max-w-sm">
                Find gear for the plans you have
              </h2>
              <p className="text-gray-500 mt-3 max-w-md text-sm">
                Explore the categories and see which items local suppliers have
                listed.
              </p>
            </div>
            <Link
              to="/browse"
              className="flex items-center gap-2 border border-gray-800 text-gray-800 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-gray-800 hover:text-white transition flex-shrink-0 self-start md:self-auto"
            >
              Browse everything <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 3-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={cat.to}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow"
                >
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden bg-amber-50">
                    <img
                      src={cat.image}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        if (
                          !event.currentTarget.src.endsWith("/placeholder.svg")
                        )
                          event.currentTarget.src = "/placeholder.svg";
                      }}
                    />

                    <div className="absolute top-3 right-3">
                      <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                        {categoryCounts.find((c) => c.name === cat.id)?.count ||
                          0}{" "}
                        items
                      </span>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg ${cat.bg} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className={`w-4.5 h-4.5 ${cat.iconColor}`} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">
                          {cat.name}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {cat.subtitle}
                        </div>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#1e3a8a] group-hover:bg-[#1d4ed8] flex items-center justify-center transition flex-shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── MOST REQUESTED ──────────────────────────────────────── */}
      <section className="bg-[#f5f0e8] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-0.5 bg-amber-500" />
                <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">
                  Recently Listed
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                Fresh finds from local suppliers
              </h2>
              <p className="text-gray-500 mt-3 max-w-md text-sm">
                Browse recently added equipment, compare the details, and check
                availability before sending a rental request.
              </p>
            </div>
            <Link
              to="/browse"
              className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition flex-shrink-0 self-start md:self-auto"
            >
              See all listings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col animate-pulse"
                >
                  <div className="h-56 bg-gray-200"></div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between mb-2">
                      <div className="w-16 h-3 bg-gray-200 rounded"></div>
                      <div className="w-12 h-3 bg-gray-200 rounded"></div>
                    </div>
                    <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="w-full h-3 bg-gray-200 rounded mb-1"></div>
                    <div className="w-5/6 h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="flex justify-between items-end mt-auto">
                      <div className="w-16 h-6 bg-gray-200 rounded"></div>
                      <div className="w-20 h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : listingsError ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1e3a8a]">
                <RotateCcw className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">
                Listings are temporarily unavailable
              </h3>
              <p className="mb-6 text-sm text-gray-500">
                We couldn’t load the marketplace just now. Please try again.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setListingsError(false);
                  setLoadAttempt((attempt) => attempt + 1);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a8a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <RotateCcw className="h-4 w-4" /> Try again
              </button>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-xl mx-auto">
              <div className="w-16 h-16 bg-blue-50 text-[#1e3a8a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 opacity-75" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                No equipment available yet
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Be the first to list equipment or check back soon as suppliers
                add new gear!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/register-supplier"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition"
                >
                  Become a Supplier <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/browse"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-5 py-2.5 rounded-xl transition"
                >
                  Browse Marketplace
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayProducts.map((p) => (
                <ListingCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <HowItWorks />

      {/* ── WHY RENT-A-WAY ──────────────────────────────────────── */}
      <WhyRentAWay />

      {/* ── FOR SUPPLIERS ───────────────────────────────────────── */}
      <ForSuppliers />

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <FAQ />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOW IT WORKS
═══════════════════════════════════════════════════════════════ */
const RENT_STEPS = [
  {
    num: "01",
    icon: Search,
    title: "Search & compare",
    desc: "Filter by category, price range and availability, then line up your shortlist side by side before you commit.",
    color: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    num: "02",
    icon: Calendar,
    title: "Pick your dates",
    desc: "Choose the dates that fit your plans and check the listing for its availability and minimum rental period.",
    color: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    num: "03",
    icon: Shield,
    title: "Send a rental request",
    desc: "Ask the supplier for your chosen dates. They confirm availability and coordinate the handover with you.",
    color: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    num: "04",
    icon: RotateCcw,
    title: "Use it, return it",
    desc: "Pick up from your supplier or arrange delivery. Use the item, return it on the agreed date, done.",
    color: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

const SUPPLIER_STEPS = [
  {
    num: "01",
    icon: Check,
    title: "Create a supplier account",
    desc: "Register as a supplier to open your equipment workspace.",
    color: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    num: "02",
    icon: Camera,
    title: "Add your equipment",
    desc: "Add photos, item details, your daily rate, and rental availability.",
    color: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    num: "03",
    icon: Shield,
    title: "Review rental requests",
    desc: "Check each request and approve or decline it from your dashboard.",
    color: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    num: "04",
    icon: RotateCcw,
    title: "Coordinate the handover",
    desc: "Message the renter about pickup or delivery and track the rental through return.",
    color: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

function HowItWorks() {
  const [tab, setTab] = useState("rent");
  const steps = tab === "rent" ? RENT_STEPS : SUPPLIER_STEPS;
  return (
    <section id="how-it-works" className="bg-[#f5f0e8] py-20 px-4">
      <div className="max-w-5xl mx-auto text-center">
        {/* Section label */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-8 h-0.5 bg-amber-500" />
          <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">
            How It Works
          </span>
          <div className="w-8 h-0.5 bg-amber-500" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
          {tab === "rent"
            ? "Rent equipment in four simple steps"
            : "List and manage equipment in four steps"}
        </h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
          {tab === "rent"
            ? "Find equipment, ask for the dates you need, and coordinate directly with the supplier."
            : "Create your supplier account, list equipment, and manage requests from your workspace."}
        </p>

        {/* Toggle pills */}
        <div
          className="inline-flex bg-white border border-gray-200 rounded-full p-1 mb-12"
          role="group"
          aria-label="Choose which process to view"
        >
          <button
            type="button"
            onClick={() => setTab("rent")}
            aria-pressed={tab === "rent"}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition ${tab === "rent" ? "bg-[#1e3a8a] text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            I want to rent
          </button>
          <button
            type="button"
            onClick={() => setTab("lend")}
            aria-pressed={tab === "lend"}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition ${tab === "lend" ? "bg-[#1e3a8a] text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            I want to lend
          </button>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-white rounded-2xl p-5 text-left border border-gray-100 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${step.iconColor}`} />
                  </div>
                  <span className="text-3xl font-extrabold text-gray-100">
                    {step.num}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA row */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to={tab === "rent" ? "/browse" : "/register-supplier"}
            className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold text-sm px-6 py-3 rounded-xl transition"
          >
            {tab === "rent" ? "Browse equipment" : "Create supplier account"}{" "}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to={tab === "rent" ? "/for-suppliers" : "/browse"}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-sm px-6 py-3 rounded-xl transition"
          >
            {tab === "rent" ? "Learn about supplying" : "Browse as a renter"}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WHY RENT-A-WAY
═══════════════════════════════════════════════════════════════ */
const WHY_FEATURES = [
  {
    icon: Shield,
    color: "bg-green-50",
    iconColor: "text-green-600",
    title: "Clear listing details",
    desc: "Check item descriptions, daily rates, availability, and supplier information while comparing your options.",
  },
  {
    icon: Wrench,
    color: "bg-teal-50",
    iconColor: "text-teal-600",
    title: "Talk directly with suppliers",
    desc: "Use Rent-A-Way messages to ask questions about an item and coordinate rental details before you request it.",
  },
  {
    icon: Calendar,
    color: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Flexible dates",
    desc: "Review the available dates and minimum rental period on each listing before you send a request.",
  },
  {
    icon: Star,
    color: "bg-amber-50",
    iconColor: "text-amber-600",
    title: "Compare listed rates",
    desc: "Compare daily prices and rental details across listings before choosing the equipment that fits your needs.",
  },
  {
    icon: MapPin,
    color: "bg-indigo-50",
    iconColor: "text-indigo-600",
    title: "Coordinate the handover",
    desc: "Discuss pickup or delivery arrangements directly with the supplier before your rental is confirmed.",
  },
  {
    icon: MessageSquare,
    color: "bg-purple-50",
    iconColor: "text-purple-600",
    title: "Renter feedback",
    desc: "When a listing has reviews, read renter feedback as another detail to consider before you send a request.",
  },
];

function WhyRentAWay() {
  return (
    <section className="bg-[#f5f0e8] py-20 px-4 border-t border-gray-200">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
          {/* Left column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-0.5 bg-amber-500" />
              <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">
                Why Rent-A-Way
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
              Know what you are requesting
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Compare item details, listed prices, and supplier information in
              one place. Send a request when you find equipment that fits your
              plans.
            </p>

            {/* Practical rental benefits */}
            <div className="bg-white border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-500 text-lg">🌿</span>
                <span className="text-sm font-bold text-gray-900">
                  Get access without buying for keeps
                </span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                Find the equipment you need for a project or occasion, then
                return it after the agreed rental period.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Compare before you request",
                  "Keep storage clutter down",
                ].map((benefit) => (
                  <span
                    key={benefit}
                    className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900"
                  >
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: 2×3 feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {WHY_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition"
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-3`}
                  >
                    <Icon className={`w-5 h-5 ${f.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOR SUPPLIERS
═══════════════════════════════════════════════════════════════ */
const SUPPLIER_BULLETS = [
  "Set your own daily rate and minimum rental duration",
  "Control availability so nothing gets double-booked",
  "Approve or decline every request before it's confirmed",
  "Track which items are out, with whom, and when they return",
];

function ForSuppliers() {
  return (
    <section className="bg-[#f5f0e8] overflow-hidden border-t border-gray-200">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch">
          {/* Left: full-bleed photo */}
          <div className="relative min-h-[380px] lg:min-h-[460px]">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80"
              alt="Supplier organising camera gear in a shop"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />

            {/* Floating stat card */}
            <div className="absolute bottom-5 left-5 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1e3a8a] rounded-lg flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">
                  Your equipment, your terms
                </div>
                <div className="text-xs text-gray-500">
                  Set rates and availability yourself
                </div>
              </div>
            </div>
          </div>

          {/* Right: content */}
          <div className="px-8 py-14 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-0.5 bg-amber-500" />
              <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">
                For Suppliers
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
              Put your equipment to work for local renters
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Give people nearby a way to find and request equipment you are
              willing to rent.
            </p>

            {/* Bullet list */}
            <ul className="space-y-3 mb-8">
              {SUPPLIER_BULLETS.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#1e3a8a] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-gray-700">{b}</span>
                </li>
              ))}
            </ul>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Link
                to="/browse"
                className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold text-sm px-5 py-3 rounded-xl transition"
              >
                Browse live listings <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register-supplier"
                className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-sm px-5 py-3 rounded-xl transition"
              >
                Create a supplier account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-gray-400 text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              Add equipment details, rates, and availability to get started.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FAQ
═══════════════════════════════════════════════════════════════ */
const FAQS = [
  {
    q: "How does renting work on Rent-A-Way?",
    a: "Search for equipment, review its details, and send the supplier a rental request for your dates. The supplier reviews the request and coordinates the handover with you. You can track the rental request in your account.",
  },
  {
    q: "What can I rent on Rent-A-Way?",
    a: "Browse cameras and drones, camping gear, sports equipment, event supplies, household tools, and school project equipment listed by suppliers around Roxas, Oriental Mindoro.",
  },
  {
    q: "How much does a rental cost?",
    a: "Suppliers set the daily rates. Compare the price, minimum rental period, and other terms on each listing before you send a request.",
  },
  {
    q: "How is my booking confirmed?",
    a: "The supplier reviews your requested dates and confirms your booking. Track each step in My Rentals.",
  },
  {
    q: "What happens if an item is damaged during my rental?",
    a: "Take photos and contact the supplier as soon as possible. Review the rental details and use the Help page if you need guidance.",
  },
  {
    q: "How do I list my own equipment as a supplier?",
    a: "Create a supplier account, then add your item details, photos, daily rate, and availability from your supplier workspace.",
  },
];

function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section className="bg-[#f5f0e8] py-20 px-4 border-t border-gray-200">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-14">
          {/* Left panel */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-0.5 bg-amber-500" />
              <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">
                Good to Know
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight mb-4">
              Questions renters ask us most
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Need help with your account or a rental? Find guidance on the help
              page.
            </p>

            {/* Talk to human card */}
            <Link
              to="/help"
              className="group bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 transition hover:border-blue-200 hover:shadow-sm"
            >
              <div className="w-9 h-9 bg-[#1e3a8a] rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900">
                  Visit Help & FAQs
                </div>
                <div className="text-xs text-gray-500">
                  Browse account and rental guidance
                </div>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#1e3a8a]" />
            </Link>
          </div>

          {/* Right: accordion */}
          <div className="lg:col-span-2 space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`rounded-2xl border transition-all ${openIdx === i ? "bg-white border-gray-200 shadow-sm" : "bg-white/60 border-gray-100 hover:border-gray-200"}`}
              >
                <button
                  onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                  aria-expanded={openIdx === i}
                  aria-controls={`home-faq-answer-${i}`}
                  id={`home-faq-question-${i}`}
                >
                  <span
                    className={`text-sm font-semibold ${openIdx === i ? "text-gray-900" : "text-gray-700"}`}
                  >
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition ${openIdx === i ? "bg-[#1e3a8a]" : "border border-gray-300"}`}
                  >
                    <span
                      className={`text-lg leading-none font-bold ${openIdx === i ? "text-white" : "text-gray-500"}`}
                    >
                      {openIdx === i ? "−" : "+"}
                    </span>
                  </div>
                </button>
                <div
                  id={`home-faq-answer-${i}`}
                  aria-labelledby={`home-faq-question-${i}`}
                  hidden={openIdx !== i}
                  className="px-5 pb-5"
                >
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
