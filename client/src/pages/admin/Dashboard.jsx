import LedgerOverview from "../../components/LedgerOverview";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  Flag,
  Package,
  Users,
} from "lucide-react";
import { getAdminRentals, getStats } from "../../api/admin";
import LoadingSpinner from "../../components/LoadingSpinner";

const TABS = ["All", "Pending", "Active", "Approved", "Completed", "Declined"];

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-blue-200 bg-blue-50 text-blue-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  completed: "border-gray-200 bg-gray-100 text-gray-700",
  returned: "border-violet-200 bg-violet-50 text-violet-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

function formatMoney(value) {
  const amount = Number(value) || 0;
  return amount >= 1000
    ? `₱${(amount / 1000).toFixed(1)}k`
    : `₱${amount.toLocaleString("en-PH")}`;
}

function formatDate(value, options = { month: "short", day: "numeric" }) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-PH", options);
}

function rentalDuration(rental) {
  if (!rental.start_date || !rental.end_date) return "—";
  const start = new Date(rental.start_date);
  const end = new Date(rental.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
  const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  return `${days} day${days === 1 ? "" : "s"}`;
}

function isInTab(status, tab) {
  if (tab === "All") return true;
  if (tab === "Declined")
    return ["rejected", "cancelled", "declined"].includes(status);
  return status === tab.toLowerCase();
}

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([getStats(), getAdminRentals()])
      .then(([statsResult, rentalsResult]) => {
        if (!isMounted) return;

        if (statsResult.status === "fulfilled") {
          setStats(statsResult.value.data?.data || {});
        } else {
          console.warn(
            "Could not load admin dashboard statistics:",
            statsResult.reason,
          );
          setLoadError(true);
        }

        if (rentalsResult.status === "fulfilled") {
          setRentals(rentalsResult.value.data?.data || []);
        } else {
          console.warn(
            "Could not load admin dashboard rentals:",
            rentalsResult.reason,
          );
          setLoadError(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRentals = useMemo(
    () => rentals.filter((rental) => isInTab(rental.status, activeTab)),
    [rentals, activeTab],
  );

  const reportedTotal = (key) =>
    stats[key] == null ? undefined : Number(stats[key]);

  return (
    <div className="ledger-dashboard">
      <div className="ledger-content">
        <LedgerOverview
          title="Admin overview"
          loading={loading}
          action={{ to: "/admin/rentals", label: "Review rentals" }}
          groups={[
            {
              title: "Marketplace",
              items: [
                { label: "Users", value: reportedTotal("totalUsers") },
                { label: "Listings", value: reportedTotal("totalProducts") },
              ],
            },
            {
              title: "Rental activity",
              items: [
                {
                  label: "Pending",
                  value: reportedTotal("pendingRentals"),
                  highlight: true,
                },
                { label: "Active", value: reportedTotal("activeRentals") },
                {
                  label: "Completed",
                  value: reportedTotal("completedRentals"),
                },
              ],
            },
          ]}
        />
        <section className="ledger-rentals space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-baseline gap-2.5">
                <h2 className="text-lg font-extrabold tracking-tight text-gray-900">
                  Rental requests
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {filteredRentals.length} bookings and customer requests in view
              </p>
            </div>

            <div className="inline-flex max-w-full self-start overflow-x-auto rounded-xl border border-gray-200/90 bg-white p-1 text-xs font-semibold text-gray-600 shadow-sm sm:self-auto">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                  className="ledger-filter-button"
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
            {loadError && (
              <div
                role="status"
                className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-900"
              >
                Some dashboard data could not be loaded. You can still open each
                admin section from the workspace navigation.
              </div>
            )}
            <div className="overflow-x-auto">
              <table
                className={`w-full border-collapse text-left ${filteredRentals.length ? "ledger-data-table" : ""}`}
              >
                <thead
                  className={
                    filteredRentals.length
                      ? undefined
                      : "hidden sm:table-header-group"
                  }
                >
                  <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="px-5 py-3">Equipment &amp; Renter</th>
                    <th className="px-4 py-3">Rental Duration</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-16">
                          <LoadingSpinner />
                          <p className="mt-3 text-xs text-gray-400">
                            Loading platform bookings…
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRentals.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="ledger-empty px-4 py-10 text-center">
                          <ClipboardList className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                          <h3 className="text-sm font-bold text-gray-800">
                            {rentals.length
                              ? "No bookings in this status"
                              : "No rental requests yet"}
                          </h3>
                          <p className="mx-auto mt-1 max-w-sm text-xs text-gray-400">
                            {rentals.length
                              ? "Choose another status filter to see more platform bookings."
                              : "New customer requests will appear here as renters make bookings."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRentals.map((rental) => {
                      const status = String(
                        rental.status || "pending",
                      ).toLowerCase();
                      const title =
                        rental.product_title ||
                        rental.title ||
                        "Equipment item";
                      return (
                        <tr
                          key={rental.id}
                          className="group transition hover:bg-amber-50/30"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-blue-50 text-blue-800">
                                <Package className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="max-w-[240px] truncate font-bold text-gray-900">
                                  {title}
                                </div>
                                <div className="mt-1 truncate text-[11px] text-gray-500">
                                  {rental.customer_name || "Renter"} · Supplier:{" "}
                                  {rental.supplier_name || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-600">
                            {rentalDuration(rental)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                            {formatDate(rental.start_date)} –{" "}
                            {formatDate(rental.end_date)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap font-bold text-gray-900">
                            {formatMoney(rental.total_price)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${STATUS_STYLES[status] || "border-gray-200 bg-gray-50 text-gray-700"}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              to="/admin/rentals"
                              className="inline-flex items-center gap-1 font-semibold text-blue-800 hover:text-blue-950 hover:underline"
                            >
                              Review <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              to="/admin/users"
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50/50"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-700" /> Manage users
              </span>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>
            <Link
              to="/admin/complaints"
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 transition hover:border-amber-200 hover:bg-amber-50/50"
            >
              <span className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-amber-700" />{" "}
                {loading || reportedTotal("openComplaints") == null
                  ? "Review complaints"
                  : `${reportedTotal("openComplaints")} open complaints`}
              </span>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>
            <Link
              to="/admin/reports"
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50/50"
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-700" /> Open platform
                reports
              </span>
              <ArrowUpRight className="h-4 w-4 text-gray-400" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
