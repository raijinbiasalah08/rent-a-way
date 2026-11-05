import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRentals, updateRentalStatus } from "../api/rentals";
import { createReview } from "../api/reviews";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import ComplaintModal from "./ComplaintModal";
import toast from "react-hot-toast";

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
    <div className="min-h-[70vh] bg-[#f5f0e8] px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <Link
              className="text-sm text-blue-800"
              to={`/${user.role}/dashboard`}
            >
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-[#0f172a] mt-2">
              {customer ? "My Rentals" : "Rental Requests"}
            </h1>
            <p className="text-gray-500 mt-1">
              Track requests, handover, and equipment returns.
            </p>
          </div>
          <Link className="btn-primary" to="/browse">
            Browse equipment
          </Link>
        </div>
        <div className="flex gap-2 flex-wrap mb-6" aria-label="Filter rentals">
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
              className={`px-4 py-2 rounded-xl capitalize ${tab === t ? "bg-[#1e3a8a] text-white" : "bg-white text-gray-600"}`}
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
                  className="bg-white border border-gray-200 rounded-2xl p-6"
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
                      <p className="mt-3 text-sm">
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
                  <div className="flex flex-wrap gap-3 mt-5">
                    {(actions[r.status] || []).map(([status, label]) => (
                      <button
                        key={status}
                        disabled={busy === r.id}
                        onClick={() => change(r, status)}
                        className="btn-primary disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                    <Link
                      className="btn-secondary"
                      to={`/messages?userId=${customer ? r.supplier_id : r.customer_id}`}
                    >
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
              <div className="bg-white rounded-2xl p-12 text-center text-gray-500">
                No rentals in this view.
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-4 mt-6">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>Page {page}</span>
          <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
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
