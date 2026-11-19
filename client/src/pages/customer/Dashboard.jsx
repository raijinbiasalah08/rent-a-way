import LedgerOverview from "../../components/LedgerOverview";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRentals } from "../../api/rentals";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Package, Calendar, MoreVertical } from "lucide-react";

export default function CustomerDashboard() {
  const { user } = useAuth();

  const [dbRentals, setDbRentals] = useState([]);
  const [summary, setSummary] = useState({});
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRental, setSelectedRental] = useState(null);

  useEffect(() => {
    getRentals()
      .then((res) => {
        setDbRentals(res.data?.data || []);
        setSummary(res.data.summary || {});
        setActivity(res.data.activity || []);
      })
      .catch((err) => console.warn("Could not load rentals:", err))
      .finally(() => setLoading(false));
  }, []);

  // Format database rentals
  const allRentals = useMemo(() => {
    return dbRentals.map((r) => {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      const diffDays = Math.max(
        1,
        Math.round((end - start) / (1000 * 60 * 60 * 24)),
      );
      return {
        ...r,
        duration_days: diffDays,
      };
    });
  }, [dbRentals]);

  // Aggregate Metrics (pure real database values, 0 when empty)
  const metrics = useMemo(() => {
    const total = summary.total || 0;
    const active = summary.active || 0;
    const completed = summary.completed || 0;
    const pending = summary.pending || 0;
    return { total, active, completed, pending };
  }, [summary]);

  // Filter agreements by status tab & search query
  const filteredRentals = useMemo(() => {
    return allRentals.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.product_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === "All") return true;
      if (activeTab === "Active")
        return r.status === "active" || r.status === "approved";
      if (activeTab === "Pending") return r.status === "pending";
      if (activeTab === "Completed")
        return r.status === "completed" || r.status === "returned";
      if (activeTab === "Overdue") return r.is_overdue;
      return true;
    });
  }, [allRentals, activeTab, searchQuery]);

  // 7-day activity data computed from real rentals (clean 0s when no rentals)
  const weeklyActivity = useMemo(() => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(Date.parse(today) - (6 - index) * 86400000);
      const key = date.toISOString().slice(0, 10);
      return {
        day: date.toLocaleDateString("en-PH", {
          weekday: "short",
          timeZone: "UTC",
        }),
        checkouts:
          Number(
            activity.find((row) => row.date === key && row.kind === "starts")
              ?.count,
          ) || 0,
        returns:
          Number(
            activity.find((row) => row.date === key && row.kind === "returns")
              ?.count,
          ) || 0,
      };
    });
  }, [activity]);

  return (
    <div className="ledger-dashboard">
      <div className="ledger-content">
        <LedgerOverview
          title="Renter Overview"
          loading={loading}
          action={{ to: "/browse", label: "Browse rentals" }}
          groups={[
            {
              title: "Bookings",
              items: [{ label: "Total rentals", value: metrics.total }],
            },
            {
              title: "Rental activity",
              items: [
                { label: "Pending", value: metrics.pending, highlight: true },
                { label: "Active", value: metrics.active },
                { label: "Completed", value: metrics.completed },
              ],
            },
          ]}
        />
        <section className="ledger-rentals bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                  Your rentals
                </h2>
              </div>
              <div className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase">
                {filteredRentals.length} AGREEMENTS IN VIEW
              </div>
            </div>
            <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
              {["All", "Active", "Pending", "Completed", "Overdue"].map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={activeTab === tab}
                    className="ledger-filter-button"
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="workspace-bookings w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Rental</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : filteredRentals.length > 0 ? (
                  filteredRentals.map((rental) => {
                    const status = rental.is_overdue
                      ? "overdue"
                      : (rental.status || "pending").toLowerCase();
                    return (
                      <tr
                        key={rental.id}
                        className="hover:bg-gray-50/70 transition group"
                      >
                        {/* RENTAL PRODUCT */}
                        <td data-label="Rental" className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-[#1e3a8a] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                              <Package className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 text-sm truncate group-hover:text-[#1e3a8a] transition">
                                {rental.product_title || "Equipment Item"}
                              </div>
                              <div className="text-[11px] font-mono text-gray-400">
                                {String(rental.id ?? "").slice(0, 7).toUpperCase()} ·{" "}
                                {rental.product_category || "General"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* SUPPLIER */}
                        <td data-label="Supplier" className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                              {rental.supplier_name
                                ? rental.supplier_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                : "SU"}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800 truncate max-w-[130px]">
                                {rental.supplier_name || "Supplier"}
                              </div>
                              {rental.supplier_barangay && (
                                <div className="truncate text-[11px] text-slate-600">
                                  Brgy. {rental.supplier_barangay}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* PERIOD */}
                        <td data-label="Period" className="py-3.5 px-3 whitespace-nowrap text-gray-600 font-medium">
                          <div>
                            {new Date(rental.start_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}{" "}
                            —{" "}
                            {new Date(rental.end_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                            <span className="ml-1.5 text-gray-400 text-[11px]">
                              ({rental.duration_days || 1}d)
                            </span>
                          </div>
                        </td>

                        {/* AMOUNT */}
                        <td data-label="Amount" className="py-3.5 px-3 font-mono font-extrabold text-gray-900 text-sm whitespace-nowrap">
                          ₱{rental.total_price?.toLocaleString()}
                        </td>

                        {/* STATUS BADGE */}
                        <td data-label="Status" className="py-3.5 px-3 whitespace-nowrap">
                          {status === "active" && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                              Active
                            </span>
                          )}
                          {status === "pending" && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              Pending
                            </span>
                          )}
                          {status === "completed" && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                              Completed
                            </span>
                          )}
                          {status === "overdue" && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#0f1729] text-white">
                              Overdue
                            </span>
                          )}
                          {![
                            "active",
                            "pending",
                            "completed",
                            "overdue",
                          ].includes(status) && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 uppercase">
                              {status}
                            </span>
                          )}
                        </td>

                        {/* ACTION BUTTON */}
                        <td data-label="Actions" className="py-3.5 px-3 text-right">
                          <Link
                            to="/customer/rentals"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 inline-flex transition"
                            title="View details"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">
                      No agreements matching the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                  Rental Activity
                </h2>
              </div>
              <div className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase">
                Scheduled starts and returns across the last 7 days ·{" "}
                {metrics.total} total bookings
              </div>
            </div>

            {/* Legend matching Pic 3 */}
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]"></span>
                <span className="text-gray-600 font-mono text-[11px] tracking-wider uppercase">
                  Scheduled starts
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="text-gray-600 font-mono text-[11px] tracking-wider uppercase">
                  Scheduled returns
                </span>
              </div>
            </div>
          </div>

          {/* Activity Chart Bars */}
          {metrics.total > 0 ? (
            <div className="grid grid-cols-7 gap-2 sm:gap-6 pt-6 pb-2 border-t border-gray-100">
              {weeklyActivity.map((item) => (
                <div
                  key={item.day}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="h-36 w-full flex items-end justify-center gap-1.5 px-1 pb-1">
                    {/* Checkouts Bar (Navy) */}
                    <div
                      style={{
                        height: `${Math.max(4, item.checkouts * 2.5)}px`,
                      }}
                      className="w-full max-w-[14px] bg-[#1e3a8a] rounded-t-sm group-hover:bg-[#1d4ed8] transition"
                      title={`Checkouts: ${item.checkouts}`}
                    ></div>
                    {/* Returns Bar (Amber) */}
                    <div
                      style={{
                        height: `${Math.max(4, item.returns * 2.5)}px`,
                      }}
                      className="w-full max-w-[14px] bg-amber-400 rounded-t-sm group-hover:bg-amber-300 transition"
                      title={`Returns: ${item.returns}`}
                    ></div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-8 pb-6 border-t border-gray-100 text-center flex flex-col items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-300 mb-2" />
              <div className="text-xs font-bold text-gray-700">
                No rental activity this week
              </div>
              <p className="text-[11px] text-gray-400 max-w-xs mt-0.5">
                Your scheduled item pick-ups and return dates will automatically
                graph here.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
