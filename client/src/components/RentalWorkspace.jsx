import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRentals, updateRentalStatus } from "../api/rentals";
import { createReview } from "../api/reviews";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import ComplaintModal from "./ComplaintModal";
import toast from "react-hot-toast";
import { Package, ArrowRight, CalendarDays, MessageSquare } from "lucide-react";

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
    <div className="min-h-[70vh] bg-[#f6f5f1] px-4 py-8 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <Link
              className="text-sm text-blue-800"
              to={`/${user.role}/dashboard`}
            >
              ← Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl tracking-tight font-bold text-[#0f172a] mt-3">
              {customer ? "My Rentals" : "Rental Requests"}
            </h1>
            <p className="text-gray-500 mt-1">
              Track requests, handover, and equipment returns.
            </p>
          </div>
          <Link
            className="btn-primary"
            to={customer ? "/browse" : "/supplier/products"}
          >
            {customer ? "Find equipment" : "Manage equipment"}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div
          className="flex gap-2 overflow-x-auto mb-6 pb-2"
          aria-label="Filter rentals"
        >
          {[
            "all",
            "pending",
            "approved",
            "active",
            "overdue",
            "returned",
            "completed",
            "cancelled",
            "rejected",
          ].map((t) => (
            <button
              key={t}
              onClick={() => {
                setPage(1);
                setTab(t);
              }}
              aria-pressed={tab === t}
              className={`shrink-0 px-4 py-3 rounded-xl text-sm font-semibold capitalize border transition-colors ${tab === t ? "bg-[#1e3a8a] border-[#1e3a8a] text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"}`}
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
          <p role="status">Loading rentals…</p>
        ) : (
          !error && (
            <div className="space-y-4">
              {rows
                .filter(
                  (r) =>
                    tab === "all" ||
                    (tab === "overdue" ? r.is_overdue : r.status === tab),
                )
                .map((r) => (
                  <article
                    key={r.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-4">
                      <div>
                        <Link
                          to={`/product/${r.product_id}`}
                          className="text-lg font-bold text-[#0f172a]"
                        >
                          {r.product_title}
                        </Link>
                        <p className="text-sm text-gray-500">
                          {customer ? r.supplier_name : r.customer_name}
                        </p>
                        <p className="mt-4 mb-2 text-sm flex items-center gap-2 text-slate-600">
                          <CalendarDays size={16} aria-hidden="true" />
                          {r.start_date} — {r.end_date}
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
                    <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-slate-100 text-sm">
                      {(actions[r.status] || []).map(([status, label]) => (
                        <button
                          key={status}
                          disabled={busy === r.id}
                          onClick={() => change(r, status)}
                          className={
                            status === "cancelled" || status === "rejected"
                              ? "btn-secondary !bg-rose-50 !text-rose-700 hover:!bg-rose-100"
                              : "btn-primary"
                          }
                        >
                          {label}
                        </button>
                      ))}
                      <Link
                        className="btn-secondary"
                        to={`/messages?userId=${customer ? r.supplier_id : r.customer_id}`}
                      >
                        <MessageSquare size={16} aria-hidden="true" />
                        Message
                      </Link>
                      {customer && r.status === "completed" && !r.review_id && (
                        <button
                          className="btn-secondary"
                          onClick={() => setReview(r)}
                        >
                          Write review
                        </button>
                      )}
                      <button
                        className="text-sm text-gray-500 underline"
                        onClick={() => setComplaint(r)}
                      >
                        Report issue
                      </button>
                    </div>
                  </article>
                ))}
              {rows.filter(
                (r) =>
                  tab === "all" ||
                  (tab === "overdue" ? r.is_overdue : r.status === tab),
              ).length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl px-5 py-14 text-center">
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
        <div className="flex justify-end items-center gap-4 mt-6 text-sm">
          <button
            className="btn-secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="btn-secondary"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
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
