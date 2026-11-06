import { apiAssetUrl } from "../../config";
import { useState, useEffect } from "react";
import {
  Link,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { getProduct } from "../../api/products";
import { createRental } from "../../api/rentals";
import LoadingSpinner from "../../components/LoadingSpinner";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, CalendarDays, Loader2 } from "lucide-react";

export default function Booking() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(query.get("start_date") || "");
  const [endDate, setEndDate] = useState(query.get("end_date") || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProduct(productId)
      .then((res) => setProduct(res.data?.data))
      .catch(() => {
        toast.error("Product not found");
        navigate("/browse");
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const days =
    startDate && endDate
      ? Math.ceil(
          (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24),
        )
      : 0;
  const total = days > 0 ? days * (product?.price_per_day || 0) : 0;

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
  }).format(new Date());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate)
      return toast.error("Please select rental dates");
    if (days <= 0) return toast.error("End date must be after start date");
    if (product?.min_days && days < product.min_days)
      return toast.error(`Minimum rental is ${product.min_days} day(s)`);
    if (product?.max_days && days > product.max_days)
      return toast.error(`Maximum rental is ${product.max_days} day(s)`);

    setSubmitting(true);
    try {
      await createRental({
        product_id: productId,
        start_date: startDate,
        end_date: endDate,
        notes,
      });
      toast.success("Rental request submitted!");
      navigate("/customer/rentals");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create rental");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div
        role="status"
        className="flex min-h-48 items-center justify-center p-8"
      >
        <LoadingSpinner />
      </div>
    );
  if (!product) return null;

  const primaryImage =
    product.images?.find((i) => i.is_primary)?.url || product.images?.[0]?.url;

  return (
    <main className="min-h-[70vh] bg-[#f6f5f1] px-3 py-6 sm:px-5 sm:py-10">
      <div className="mx-auto w-full min-w-0 max-w-3xl">
        <Link
          to={`/product/${product.id}`}
          className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-blue-800 hover:text-blue-950"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to equipment
        </Link>
        <div className="mb-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Rental request
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-700 sm:text-3xl">
            Choose your dates
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Check the rental period and send a request to the supplier.
          </p>
        </div>

        <form onSubmit={handleSubmit} aria-busy={submitting}>
          <div className="card min-w-0 space-y-5 sm:space-y-6">
            {/* Product Summary */}
            <div className="flex min-w-0 items-start gap-3 border-b border-gray-100 pb-4 sm:gap-4">
              <img
                src={
                  primaryImage ? apiAssetUrl(primaryImage) : "/placeholder.svg"
                }
                alt={product.title}
                className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
                onError={(e) => {
                  e.target.src = "/placeholder.svg";
                }}
              />

              <div className="min-w-0 flex-1">
                <h2 className="mb-1 break-words text-lg font-bold text-navy-700 sm:text-xl">
                  {product.title}
                </h2>
                <p className="text-gray-500 text-sm mb-1">
                  by {product.supplier_name}
                </p>
                <p className="text-navy-700 font-bold text-lg">
                  ₱{product.price_per_day?.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-gray-500">
                    / day
                  </span>
                </p>
                {(product.min_days || product.max_days) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {product.min_days && `Min: ${product.min_days} day(s)`}
                    {product.min_days && product.max_days && " · "}
                    {product.max_days && `Max: ${product.max_days} day(s)`}
                  </p>
                )}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="booking-start-date" className="label">
                  Start date
                </label>
                <input
                  id="booking-start-date"
                  type="date"
                  className="input block box-border min-h-12 w-full min-w-0 max-w-full appearance-none"
                  min={today}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate && e.target.value >= endDate) setEndDate("");
                  }}
                  required
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="booking-end-date" className="label">
                  End date
                </label>
                <input
                  id="booking-end-date"
                  type="date"
                  className="input block box-border min-h-12 w-full min-w-0 max-w-full appearance-none"
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Duration Display */}
            {days > 0 && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center justify-between gap-4 rounded-xl bg-navy-50 p-4"
              >
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-bold text-navy-700">
                    {days} day{days !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Rate</p>
                  <p className="text-sm text-gray-600">
                    ₱{product.price_per_day?.toLocaleString()} × {days}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="booking-notes" className="label">
                Notes to Supplier{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="booking-notes"
                className="input min-h-24 w-full resize-y"
                maxLength={2000}
                aria-label="Notes to supplier (optional)"
                placeholder="Any special requests or details for the supplier..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Total & Submit */}
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-base font-bold text-gray-700 sm:text-lg">
                  Estimated total
                </span>
                <span className="shrink-0 text-2xl font-extrabold text-navy-700 sm:text-3xl">
                  {days > 0 ? `₱${total.toLocaleString()}` : "—"}
                </span>
              </div>
              <p className="mb-4 flex items-center gap-2 text-xs leading-relaxed text-gray-500">
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                {days > 0
                  ? `${days} day${days === 1 ? "" : "s"} × ₱${Number(product.price_per_day || 0).toLocaleString()} per day`
                  : "Choose a valid date range to see your estimate."}
              </p>
              <button
                type="submit"
                disabled={submitting || days <= 0}
                className="btn-primary min-h-12 w-full py-3 text-base disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Sending request…
                  </>
                ) : (
                  <>
                    Send rental request
                    <ArrowRight size={17} aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                This sends a request only. The supplier will confirm
                availability; the amount shown is an estimate.
              </p>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
