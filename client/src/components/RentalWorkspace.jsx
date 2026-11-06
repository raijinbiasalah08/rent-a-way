import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRentals, updateRentalStatus } from "../api/rentals";
import { createReview } from "../api/reviews";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import ComplaintModal from "./ComplaintModal";
import toast from "react-hot-toast";
import {
  Package,
  ArrowRight,
  CalendarDays,
  MessageSquare,
  Loader2,
} from "lucide-react";

const RENTAL_STATUSES = [
  "all",
  "pending",
  "approved",
  "active",
  "overdue",
  "returned",
  "completed",
  "cancelled",
  "rejected",
];

export default function RentalWorkspace() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const customer = user.role === "customer";
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [tab, setTab] = useState("all"),
    [busy, setBusy] = useState(""),
    [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [review, setReview] = useState(null),
    [rating, setRating] = useState("5"),
    [comment, setComment] = useState(""),
    [complaint, setComplaint] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getRentals({ page, limit: 50, status: tab });
      setRows(result.data.data);
      setHasMore(result.data.hasMore);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load rentals");
    } finally {
      setLoading(false);
    }
  }, [page, tab]);
  const filteredRows = rows.filter(
    (r) =>
      tab === "all" || (tab === "overdue" ? r.is_overdue : r.status === tab),
  );
  useEffect(() => {
    load();
    socket?.on("rental_status_changed", load);
    socket?.on("connect", load);
    return () => {
      socket?.off("rental_status_changed", load);
      socket?.off("connect", load);
    };
  }, [load, socket]);
  async function change(r, status) {
    setBusy(r.id);
    try {
      await updateRentalStatus(r.id, status);
      toast.success("Rental updated");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to update rental");
    } finally {
      setBusy("");
    }
  }
  async function submitReview(e) {
    e.preventDefault();
    setBusy(review.id);
    try {
      await createReview({
        rental_id: review.id,
        product_id: review.product_id,
        rating: Number(rating),
        comment,
      });
      setReview(null);
      setComment("");
      toast.success("Review published");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to submit review");
    } finally {
      setBusy("");
    }
  }
  const actions = customer
    ? {
        pending: [["cancelled", "Cancel request"]],
        approved: [["cancelled", "Cancel booking"]],
        active: [["returned", "Mark returned"]],
      }
    : {
        pending: [
          ["approved", "Approve"],
          ["rejected", "Decline"],
        ],
        approved: [
          ["active", "Confirm handover"],
          ["cancelled", "Cancel booking"],
        ],
        active: [["returned", "Record return"]],
        returned: [["completed", "Verify return"]],
      };
  return (
    <div className="min-h-[70vh] bg-[#f6f5f1] px-3 py-6 sm:px-4 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <Link
              className="inline-flex min-h-10 items-center text-sm font-medium text-blue-800 hover:text-blue-950"
              to={`/${user.role}/dashboard`}
            >
              ← Dashboard
            </Link>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {customer ? "Your account" : "Supplier workspace"}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl">
              {customer ? "My Rentals" : "Rental Requests"}
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-500">
              {customer
                ? "Track booking requests, pickup, and returns in one place."
                : "Review requests and keep every handover and return up to date."}
            </p>
          </div>
          <Link
            className="btn-primary w-full sm:w-auto"
            to={customer ? "/browse" : "/supplier/products"}
          >
            {customer ? "Find equipment" : "Manage equipment"}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <label className="mb-5 block sm:hidden">
          <span className="mb-2 block text-xs font-semibold text-slate-600">
            Filter by status
          </span>
          <select
            value={tab}
            onChange={(e) => {
              setPage(1);
              setTab(e.target.value);
            }}
            className="input min-h-12 text-sm capitalize"
          >
            {RENTAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All rentals" : status}
              </option>
            ))}
          </select>
        </label>
        <div
          className="mb-6 hidden flex-wrap gap-2 sm:flex"
          role="group"
          aria-label="Filter rentals by status"
        >
          {RENTAL_STATUSES.map((t) => (
            <button
              key={t}
              onClick={() => {
                setPage(1);
                setTab(t);
              }}
              aria-pressed={tab === t}
              className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold capitalize transition-colors ${tab === t ? "bg-[#1e3a8a] border-[#1e3a8a] text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {error && (
          <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl">
            {error}{" "}
            <button onClick={load} className="underline">
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div
            role="status"
            className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-600"
          >
            <Loader2 className="h-5 w-5 animate-spin text-blue-800" />
            Loading rentals…
          </div>
        ) : (
          !error && (
            <div className="space-y-4">
              {filteredRows.map((r) => (
                <article
                  key={r.id}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
                >
                  <div className="flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:gap-4">
                    <div className="min-w-0">
                      <Link
                        to={`/product/${r.product_id}`}
                        className="break-words text-base font-bold text-[#0f172a] hover:text-blue-800 sm:text-lg"
                      >
                        {r.product_title}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        {customer ? r.supplier_name : r.customer_name}
                      </p>
                      <p className="mb-2 mt-3 flex items-center gap-2 text-sm text-slate-600 sm:mt-4">
                        <CalendarDays size={16} aria-hidden="true" />
                        <span className="min-w-0 break-words">
                          {r.start_date} — {r.end_date}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Estimated rental value: ₱
                        {Number(r.total_price).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`h-fit px-3 py-1 rounded-full text-sm capitalize ${r.is_overdue ? "bg-red-100 text-red-800" : "bg-blue-50 text-blue-800"}`}
                    >
                      {r.is_overdue ? "Overdue" : r.status}
                    </span>
                  </div>
                  {r.notes && (
                    <p className="text-sm mt-3 text-gray-600 whitespace-pre-wrap">
                      {r.notes}
                    </p>
                  )}
                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm sm:mt-5 sm:flex-row sm:flex-wrap sm:gap-3">
                    {(actions[r.status] || []).map(([status, label]) => (
                      <button
                        key={status}
                        disabled={busy === r.id}
                        onClick={() => change(r, status)}
                        className={
                          status === "cancelled" || status === "rejected"
                            ? "btn-secondary min-h-11 w-full !bg-rose-50 !text-rose-700 hover:!bg-rose-100 sm:w-auto"
                            : "btn-primary min-h-11 w-full sm:w-auto"
                        }
                      >
                        {label}
                      </button>
                    ))}
                    <Link
                      className="btn-secondary min-h-11 w-full sm:w-auto"
                      to={`/messages?userId=${customer ? r.supplier_id : r.customer_id}`}
                    >
                      <MessageSquare size={16} aria-hidden="true" />
                      Message
                    </Link>
                    {customer && r.status === "completed" && !r.review_id && (
                      <button
                        className="btn-secondary min-h-11 w-full sm:w-auto"
                        onClick={() => setReview(r)}
                      >
                        Write review
                      </button>
                    )}
                    <button
                      className="min-h-11 w-full rounded-lg text-sm font-medium text-gray-500 underline sm:w-auto"
                      onClick={() => setComplaint(r)}
                    >
                      Report issue
                    </button>
                  </div>
                </article>
              ))}
              {filteredRows.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center sm:py-14">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
                    <Package size={30} aria-hidden="true" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {tab === "all"
                      ? "Your rental journey starts here"
                      : `No ${tab} rentals`}
                  </h2>
                  <p className="mx-auto mt-2 mb-6 max-w-sm text-sm leading-6 text-slate-500">
                    {tab !== "all"
                      ? "Try another status to find your booking."
                      : customer
                        ? "Find equipment nearby and send your first request. You can follow every step right here."
                        : "Customer requests will appear here when someone books your equipment."}
                  </p>
                  {tab !== "all" ? (
                    <button
                      className="btn-secondary text-sm"
                      onClick={() => {
                        setTab("all");
                        setPage(1);
                      }}
                    >
                      View all rentals
                    </button>
                  ) : (
                    <Link
                      className="btn-primary text-sm"
                      to={customer ? "/browse" : "/supplier/products"}
                    >
                      {customer ? "Explore equipment" : "View my equipment"}
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          )
        )}
        {(rows.length > 0 || hasMore || page > 1) && (
          <nav
            aria-label="Rental pages"
            className="mt-6 flex items-center justify-between gap-3 text-sm sm:justify-end sm:gap-4"
          >
            <button
              className="btn-secondary min-h-11 px-4"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span role="status" className="shrink-0 text-slate-600">
              Page {page}
              {hasMore ? " · More results" : ""}
            </span>
            <button
              className="btn-secondary min-h-11 px-4"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </nav>
        )}
        {review && (
          <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
            <form
              onSubmit={submitReview}
              role="dialog"
              aria-modal="true"
              aria-label="Write review"
              className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4"
            >
              <h2 className="text-xl font-bold">
                Review {review.product_title}
              </h2>
              <label className="block">
                Rating
                <select
                  className="input"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} stars
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Your experience
                <textarea
                  className="input"
                  maxLength={5000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
              <button disabled={!!busy} className="btn-primary">
                Publish review
              </button>
              <button
                type="button"
                onClick={() => setReview(null)}
                className="ml-4"
              >
                Cancel
              </button>
            </form>
          </div>
        )}
        {complaint && (
          <ComplaintModal
            reportedId={
              customer ? complaint.supplier_id : complaint.customer_id
            }
            reportedName={
              customer ? complaint.supplier_name : complaint.customer_name
            }
            onClose={() => setComplaint(null)}
          />
        )}
      </div>
    </div>
  );
}
