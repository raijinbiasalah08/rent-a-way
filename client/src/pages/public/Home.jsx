import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search,
  ArrowRight,
  MapPin,
  Heart,
  LayoutGrid,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import { getProducts } from "../../api/products";
import { useFavorites } from "../../context/FavoritesContext";
import { apiAssetUrl } from "../../config";
import "./Home.css";

const CATEGORIES = [
  {
    id: "Cameras",
    name: "Cameras & Drones",
    icon: "/category-icons/camera.png",
  },
  {
    id: "Camping",
    name: "Camping Equipment",
    icon: "/category-icons/mountain.png",
  },
  {
    id: "Sports",
    name: "Sports Equipment",
    icon: "/category-icons/bicycle.png",
  },
  {
    id: "Event",
    name: "Event Equipment",
    icon: "/category-icons/calendar.png",
  },
  {
    id: "Household",
    name: "Household Equipment",
    icon: "/category-icons/wrench.png",
  },
  {
    id: "School",
    name: "School Project Equipment",
    icon: "/category-icons/book.png",
  },
  {
    id: "Vehicles",
    name: "Vehicles",
    icon: "/category-icons/car.png",
  },
  {
    id: "Apartments",
    name: "Apartments",
    icon: "/category-icons/apartment.png",
  },
];
const MARKETPLACE_FEATURES = [
  { icon: Search, label: "COMPARE LOCAL LISTINGS" },
  { icon: MessageSquare, label: "MESSAGE SUPPLIERS" },
  { icon: CalendarDays, label: "CHOOSE YOUR DATES" },
  { icon: MapPin, label: "RENTALS AROUND ROXAS" },
];

function ListingCard({ product }) {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const saved = favoriteIds?.has(product.id);
  const image = product.primary_image
    ? apiAssetUrl(product.primary_image)
    : "/placeholder.svg";
  return (
    <article className="rental-card motion-card">
      <Link
        to={`/product/${product.id}`}
        className="rental-photo"
        aria-label={`View ${product.title}`}
      >
        <img
          src={image}
          alt={product.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
      </Link>
      <button
        type="button"
        className="rental-save"
        aria-label={`${saved ? "Unsave" : "Save"} ${product.title}`}
        aria-pressed={Boolean(saved)}
        onClick={() => toggleFavorite(product.id)}
      >
        <Heart size={19} fill={saved ? "currentColor" : "none"} />
      </button>
      <div className="rental-card-body">
        <Link to={`/product/${product.id}`}>
          <h3>{product.title}</h3>
        </Link>
        <p>
          {product.barangay
            ? `${product.barangay}, Roxas`
            : product.location || "Roxas, Oriental Mindoro"}
        </p>
        <div className="rental-card-price">
          <strong>₱{Number(product.price_per_day).toLocaleString()}</strong>
          <span> / day</span>
        </div>
        {product.availability && product.availability !== "available" && (
          <span className="rental-status">
            {product.availability.replaceAll("_", " ")}
          </span>
        )}
      </div>
    </article>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(false);
    getProducts({ limit: 12, ...(category ? { category } : {}) })
      .then((response) => {
        if (current) setProducts(response.data?.data?.products || []);
      })
      .catch(() => {
        if (current) setError(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [category, retry]);

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const mapUrl = `/map${params.size ? "?" + params : ""}`;
  const browseUrl = `/browse${params.size ? "?" + params : ""}`;
  const sorted = [...products].sort((a, b) =>
    sort === "low"
      ? Number(a.price_per_day) - Number(b.price_per_day)
      : sort === "high"
        ? Number(b.price_per_day) - Number(a.price_per_day)
        : new Date(b.created_at) - new Date(a.created_at),
  );
  function submitSearch(event) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (search.trim()) query.set("q", search.trim());
    if (searchCategory) query.set("category", searchCategory);
    navigate(`/browse${query.size ? "?" + query : ""}`);
  }
  function selectCategory(value) {
    setCategory(value);
    document.getElementById("explore-rentals")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  return (
    <div className="market-home">
      <Helmet>
        <title>Rent-A-Way — Rentals in Roxas</title>
        <meta
          name="description"
          content="Explore equipment, vehicles and apartments from local suppliers in Roxas, Oriental Mindoro."
        />
      </Helmet>
      <section className="market-hero">
        <div className="market-container market-hero-grid">
          <div>
            <h1>
              Find your next rental
              <br />
              in <span>Roxas.</span>
            </h1>
            <p>Equipment, vehicles and apartments from local suppliers.</p>
            <form
              onSubmit={submitSearch}
              className="market-search"
              aria-label="Search rentals"
            >
              <label>
                <Search size={20} aria-hidden="true" />
                <span className="sr-only">Search rentals</span>
                <input
                  type="search"
                  placeholder="What are you looking for?"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  maxLength={200}
                />
              </label>
              <select
                aria-label="Rental category"
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button type="submit">
                Find rentals <ArrowRight size={16} />
              </button>
            </form>
          </div>
          <div className="market-hero-photos" aria-hidden="true">
            <img
              className="market-stay-photo"
              src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=700&q=85&fit=crop"
              alt=""
            />
            <img
              className="market-camera-photo"
              src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=85&fit=crop"
              alt=""
            />
          </div>
        </div>
      </section>
      <div
        className="market-feature-ticker"
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
                  <span className="market-feature-dot">●</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="market-container">
        <nav className="market-categories" aria-label="Rental categories">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              onClick={() => selectCategory(item.id)}
              aria-pressed={category === item.id}
            >
              <img src={item.icon} alt="" width="72" height="72" />
              <span>{item.id === "Event" ? "Events" : item.id}</span>
            </button>
          ))}
        </nav>
        <section id="explore-rentals" className="market-explore">
          <div className="market-section-heading">
            <h2>Explore rentals</h2>
            <div className="market-tools">
              <label>
                <span className="sr-only">Sort displayed rentals</span>
                <select
                  aria-label="Sort displayed rentals"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                </select>
              </label>
              <div className="market-view">
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
          </div>
          <div
            className="market-filter-chips"
            aria-label="Filter rentals by category"
          >
            {[{ id: "", name: "All rentals" }, ...CATEGORIES].map((item) => (
              <button
                key={item.id}
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.id === "Event" ? "Events" : item.id || item.name}
              </button>
            ))}
          </div>
          {loading ? (
            <div
              className="market-listings"
              aria-label="Loading rentals"
              aria-busy="true"
            >
              {[0, 1, 2].map((n) => (
                <div
                  key={n}
                  className="market-skeleton motion-safe:animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="market-empty" role="alert">
              <h3>We couldn’t load the rentals.</h3>
              <p>Please try again in a moment.</p>
              <button onClick={() => setRetry((n) => n + 1)}>Try again</button>
            </div>
          ) : sorted.length ? (
            <div className="market-listings">
              {sorted.map((product) => (
                <ListingCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="market-empty">
              <h3>
                {category
                  ? `No ${category.toLowerCase()} listings yet`
                  : "New rentals will appear here"}
              </h3>
              <p>
                {category
                  ? "Explore another category or check back soon."
                  : "Local suppliers can add their first listing."}
              </p>
              {category ? (
                <button onClick={() => setCategory("")}>
                  View all categories
                </button>
              ) : (
                <Link to="/for-suppliers">
                  List a rental <ArrowRight size={16} />
                </Link>
              )}
            </div>
          )}
          <Link className="market-browse-all" to={browseUrl}>
            Browse all rentals <ArrowRight size={17} />
          </Link>
        </section>
        <section id="how-it-works" className="market-how">
          <div>
            <h2>From finding it to renting it.</h2>
            <p>A few simple steps to arrange your rental.</p>
            <Link to="/how-it-works">
              How it works <ArrowRight size={16} />
            </Link>
          </div>
          <ol>
            <li>
              <strong>Find your rental</strong>
              <p>Compare listings and choose your dates.</p>
            </li>
            <li>
              <strong>Send a request</strong>
              <p>Confirm availability and arrange pickup with the supplier.</p>
            </li>
            <li>
              <strong>Enjoy and return</strong>
              <p>Follow the agreed rental terms and return on time.</p>
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
