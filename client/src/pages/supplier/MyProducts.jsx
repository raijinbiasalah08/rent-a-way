import WorkspacePage, { WorkspaceEmpty } from "../../components/WorkspacePage";
import ListingSearch, { matchesListing } from "../../components/ListingSearch";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  MapPin,
  Tag,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react";
import api from "../../api/axios";
import { apiAssetUrl } from "../../config";

const AVAILABILITY_COLORS = {
  available: "bg-green-100 text-green-700",
  limited: "bg-amber-100 text-amber-700",
  rented: "bg-blue-100 text-blue-700",
};

export default function MyProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState("");

  const fetchProducts = () => {
    setLoading(true);
    setError("");
    api
      .get("/products/mine")
      .then((res) => setProducts(res.data.data || []))
      .catch(() => setError("Failed to load your listings."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Failed to delete listing. Please try again.");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const toggleAvailability = async (product) => {
    const next = product.availability === "available" ? "rented" : "available";
    setUpdatingId(product.id);
    try {
      await api.put(`/products/${product.id}`, {
        title: product.title,
        description: product.description,
        category: product.category,
        price_per_day: product.price_per_day,
        min_days: product.min_days,
        max_days: product.max_days,
        specs: product.specs,
        availability: next,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, availability: next } : p,
        ),
      );
    } catch {
      setError("Failed to update availability.");
    } finally {
      setUpdatingId(null);
    }
  };

  const [query, setQuery] = useState("");
  const matches = products.filter((item) => matchesListing(item, query));
  return (
    <WorkspacePage
      title="Inventory"
      description="Manage your listings, availability, and daily rates."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="workspace-secondary"
            to="/supplier/products/new?plans"
          >
            Subscription packages
          </Link>
          <Link className="workspace-primary" to="/supplier/products/new">
            <Plus size={16} /> Add listing
          </Link>
        </div>
      }
    >
      {!loading && products.length > 0 && (
        <ListingSearch
          label="Search inventory"
          query={query}
          onChange={setQuery}
          count={matches.length}
        />
      )}
      {error && products.length > 0 && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error && products.length === 0 ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-white px-5 py-10 text-center"
        >
          <h2 className="font-bold text-gray-900">
            Couldn’t load your listings
          </h2>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <button
            type="button"
            onClick={fetchProducts}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1e3a8a] px-5 font-semibold text-white"
          >
            Try again
          </button>
        </div>
      ) : products.length === 0 ? (
        <section className="workspace-surface">
          <WorkspaceEmpty icon={Package} title="No listings yet">
            Choose Add listing to publish your first rental.
          </WorkspaceEmpty>
        </section>
      ) : matches.length === 0 ? (
        <section className="workspace-surface">
          <WorkspaceEmpty icon={Package} title="No matching listings">
            <button
              className="workspace-secondary mt-2"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          </WorkspaceEmpty>
        </section>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {matches.map((product) => (
            <div
              key={product.id}
              className="workspace-surface min-w-0 overflow-hidden flex flex-col"
            >
              {/* Image */}
              <div className="relative h-36 bg-gray-100 overflow-hidden">
                {product.primary_image ? (
                  <img
                    src={apiAssetUrl(product.primary_image)}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                {/* Availability badge */}
                <div className="absolute top-3 left-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${AVAILABILITY_COLORS[product.availability] || "bg-gray-100 text-gray-600"}`}
                  >
                    {product.availability}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">
                    {product.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <Tag className="w-3 h-3" />
                  <span>{product.category}</span>
                </div>
                <div className="text-lg font-extrabold text-gray-900 mb-1">
                  ₱{Number(product.price_per_day).toLocaleString()}
                  <span className="text-xs font-normal text-slate-500">
                    {" "}
                    /day
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Min {product.min_days} day{product.min_days !== 1 ? "s" : ""}
                </p>

                {/* Toggle availability */}
                <button
                  type="button"
                  disabled={updatingId === product.id}
                  aria-pressed={product.availability === "available"}
                  onClick={() => toggleAvailability(product)}
                  className="mb-4 flex min-h-11 items-center gap-2 rounded-lg text-xs text-gray-500 transition hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 disabled:opacity-60"
                >
                  {product.availability === "available" ? (
                    <ToggleRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-slate-500" />
                  )}
                  {updatingId === product.id
                    ? "Updating availability…"
                    : product.availability === "available"
                      ? "Listed as available"
                      : "Listed as unavailable"}
                </button>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <Link
                    to={`/supplier/products/${product.id}/edit`}
                    className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition hover:border-[#1e3a8a] hover:text-[#1e3a8a]"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Link>
                  {confirmId === product.id ? (
                    <div className="flex-1 flex gap-1">
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="min-h-11 flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                      >
                        {deletingId === product.id ? "…" : "Yes, delete"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="min-h-11 flex-1 rounded-lg bg-gray-100 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(product.id)}
                      className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-50 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspacePage>
  );
}
