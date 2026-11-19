import WorkspacePage, { WorkspaceEmpty } from "./WorkspacePage";
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
    <WorkspacePage
      title={customer ? "My rentals" : "Rental requests"}
      description={
        customer
          ? "Track your requests, pickup dates, and returns."
          : "Review booking requests and manage handovers and returns."
      }
      action={
        <Link
          className="workspace-secondary"
          to={customer ? "/browse" : "/supplier/products"}
        >
          {customer ? "Browse rentals" : "View inventory"}{" "}
          <ArrowRight size={16} />
        </Link>
      }
    >
      <section className="workspace-surface min-w-0 overflow-hidden">
        <label className="block border-b border-slate-200 p-3 sm:hidden">
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
          className="hidden flex-wrap gap-1 border-b border-slate-200 p-3 sm:flex"
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
              className={`min-h-11 shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-[#14263f] border-[#14263f] text-white shadow-sm" : "bg-transparent border-transparent text-slate-600 hover:border-blue-300"}`}
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
            <div className="divide-y divide-slate-200">
              {filteredRows.map((r) => (
                <article key={r.id} className="min-w-0 p-4 sm:px-5">
                  <div className="grid min-w-0 grid-cols-2 items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_7rem]">
                    <div className="col-span-2 min-w-0 lg:col-span-1">
                      <Link
                        to={`/product/${r.product_id}`}
                        className="break-words text-base font-bold text-[#0f172a] hover:text-blue-800 sm:text-lg"
                      >
                        {r.product_title}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        {customer ? "Supplier" : "Renter"} ·{" "}
                        {customer ? r.supplier_name : r.customer_name}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-slate-600">
                        Rental period
                      </p>
                      <p className="flex items-center gap-2 text-sm text-slate-800">
                        <CalendarDays
                          size={15}
                          className="hidden shrink-0 lg:block"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 break-words">
                          {r.start_date} — {r.end_date}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-slate-600">
                        Estimated value
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-slate-900">
                        ₱{Number(r.total_price).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`h-fit justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${r.is_overdue ? "bg-red-100 text-red-800" : "bg-blue-50 text-blue-800"}`}
                    >
                      {r.is_overdue ? "Overdue" : r.status}
                    </span>
                  </div>
                  {r.notes && (
                    <p className="text-sm mt-3 text-gray-600 whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {r.notes}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {(actions[r.status] || []).map(([status, label]) => (
                      <button
                        key={status}
                        disabled={busy === r.id}
                        onClick={() => change(r, status)}
                        className={
                          status === "cancelled" || status === "rejected"
                            ? "btn-secondary min-h-11 !bg-rose-50 !text-rose-700 hover:!bg-rose-100 sm:w-auto"
                            : "btn-primary min-h-11"
                        }
                      >
                        {label}
                      </button>
                    ))}
                    <Link
                      className="btn-secondary min-h-11"
                      to={`/messages?userId=${customer ? r.supplier_id : r.customer_id}`}
                    >
                      <MessageSquare size={16} aria-hidden="true" />
                      Message
                    </Link>
                    {customer && r.status === "completed" && !r.review_id && (
                      <button
                        className="btn-secondary min-h-11"
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
                <WorkspaceEmpty
                  icon={Package}
                  title={
                    tab === "all"
                      ? customer
                        ? "No rentals yet"
                        : "No rental requests yet"
                      : `No ${tab} rentals`
                  }
                >
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
                </WorkspaceEmpty>
              )}
            </div>
          )
        )}
        {(hasMore || page > 1) && (
          <nav
            aria-label="Rental pages"
            className="border-t border-slate-200 p-3 flex items-center justify-between gap-3 text-sm sm:justify-end sm:gap-4"
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
      </section>
      {review && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <form
            onSubmit={submitReview}
            role="dialog"
            aria-modal="true"
            aria-label="Write review"
            className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4"
          >
            <h2 className="text-xl font-bold">Review {review.product_title}</h2>
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
          reportedId={customer ? complaint.supplier_id : complaint.customer_id}
          reportedName={
            customer ? complaint.supplier_name : complaint.customer_name
          }
          onClose={() => setComplaint(null)}
        />
      )}
    </WorkspacePage>
  );
}
