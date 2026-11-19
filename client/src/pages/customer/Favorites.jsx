import WorkspacePage, { WorkspaceEmpty } from "../../components/WorkspacePage";
import ListingSearch, { matchesListing } from "../../components/ListingSearch";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getFavorites } from "../../api/favorites";
import { ArrowRight, Star, MapPin, Calendar, Heart } from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useFavorites } from "../../context/FavoritesContext";
import { apiAssetUrl } from "../../config";

function StatusBadge({ status }) {
  if (status === "available")
    return (
      <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />{" "}
        Available
      </span>
    );

  if (status === "limited")
    return (
      <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{" "}
        Limited stock
      </span>
    );

  return (
    <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />{" "}
      Rented out
    </span>
  );
}

function ProductCard({ product }) {
  const { toggleFavorite } = useFavorites();
  const image = product.primary_image
    ? apiAssetUrl(product.primary_image)
    : "/placeholder.svg";
  return (
    <div className="workspace-surface min-w-0 overflow-hidden group flex flex-col">
      <div className="relative h-36 bg-[#f5f0e8] overflow-hidden">
        <img
          src={image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        <div className="absolute top-3 left-3">
          <StatusBadge status={product.availability || "available"} />
        </div>
        <button
          type="button"
          aria-label={`Remove ${product.title} from favorites`}
          title="Remove from favorites"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.product_id);
          }}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4 text-red-500 fill-current"
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
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            {product.category}
          </span>
          <div className="flex items-center gap-1">
            {product.avg_rating != null && (
              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
            )}
            <span className="text-xs font-semibold text-gray-700">
              {product.avg_rating != null
                ? Number(product.avg_rating).toFixed(1)
                : "No reviews yet"}
            </span>
          </div>
        </div>
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1.5 line-clamp-2">
          {product.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4 mt-auto">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />{" "}
            {product.barangay || product.location || "Roxas"}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 shrink-0" /> Min{" "}
            {product.min_days || 1}{" "}
            {Number(product.min_days || 1) === 1 ? "day" : "days"}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl font-extrabold text-gray-900">
              ₱{Number(product.price_per_day || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">per day</div>
          </div>
          <Link
            to={`/product/${product.product_id}`}
            className="flex min-h-11 items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition"
          >
            View <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const { favoriteIds } = useFavorites();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getFavorites()
      .then((res) => {
        if (active) setFavorites(res.data?.data?.items || []);
      })
      .catch(() => {
        if (active) setError("We couldn’t load your saved equipment.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [favoriteIds, retry]);

  const [query, setQuery] = useState("");
  const matches = favorites.filter((item) => matchesListing(item, query));
  return (
    <WorkspacePage
      title="Saved gear"
      description="Compare your saved rentals and check their availability."
      action={
        <Link className="workspace-secondary" to="/browse">
          Browse rentals <ArrowRight size={16} />
        </Link>
      }
    >
      {!loading && favorites.length > 0 && (
        <ListingSearch
          label="Search saved gear"
          query={query}
          onChange={setQuery}
          count={matches.length}
        />
      )}
      {loading ? (
        <div
          role="status"
          className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white"
        >
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-white px-5 py-10 text-center sm:py-14"
        >
          <h2 className="text-lg font-bold text-slate-900">
            Saved items are unavailable
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {error} Your favorites are still saved to your account.
          </p>
          <button
            type="button"
            onClick={() => setRetry((current) => current + 1)}
            className="btn-primary mt-5 min-h-11"
          >
            Try again
          </button>
        </div>
      ) : favorites.length === 0 ? (
        <section className="workspace-surface">
          <WorkspaceEmpty icon={Heart} title="No saved gear yet">
            Tap the heart on a rental to save it here.
          </WorkspaceEmpty>
        </section>
      ) : matches.length === 0 ? (
        <section className="workspace-surface">
          <WorkspaceEmpty icon={Heart} title="No matching listings">
            <button
              className="workspace-secondary mt-2"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          </WorkspaceEmpty>
        </section>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {matches.map((fav) => (
            <ProductCard key={fav.product_id} product={fav} />
          ))}
        </div>
      )}
    </WorkspacePage>
  );
}
