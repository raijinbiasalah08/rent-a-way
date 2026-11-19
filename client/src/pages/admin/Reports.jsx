import { useState, useEffect } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Package,
  Users,
} from "lucide-react";
import { getReports, getStats } from "../../api/admin";
import WorkspacePage, { WorkspaceEmpty } from "../../components/WorkspacePage";
import { adminActionClass } from "../../components/AdminRecords";

const METRICS = [
  ["totalRentals", "Total rentals", CalendarDays],
  ["activeRentals", "Active rentals", CheckCircle2],
  ["pendingRentals", "Pending requests", Clock3],
  ["totalProducts", "Total listings", Package],
  ["totalUsers", "Total users", Users],
];
const formatNumber = new Intl.NumberFormat("en-PH").format;

function RentalBreakdown({ title, description, rows, empty }) {
  const maxCount = Math.max(1, ...rows.map(({ count }) => count));

  return (
    <section className="workspace-surface min-w-0">
      <header className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </header>
      {rows.length === 0 ? (
        <WorkspaceEmpty icon={BarChart3} title="No rental activity yet">
          {empty}
        </WorkspaceEmpty>
      ) : (
        <ol className="space-y-4 px-4 py-5 sm:px-5">
          {rows.map(({ label, count }, index) => (
            <li key={`${label}-${index}`} className="min-w-0">
              <div className="mb-1.5 flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium text-slate-800 [overflow-wrap:anywhere]">
                  {label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                  {formatNumber(count)}{" "}
                  <span className="font-normal text-slate-600">
                    {count === 1 ? "rental" : "rentals"}
                  </span>
                </span>
              </div>
              <div aria-hidden="true" className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#233f74]"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function Reports() {
  const [reports, setReports] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setFailed(false);
    Promise.all([getReports(), getStats()])
      .then(([reportsRes, statsRes]) => {
        if (!current) return;
        setReports(reportsRes.data?.data || {});
        setStats(statsRes.data?.data || {});
      })
      .catch(() => {
        if (current) setFailed(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  const topProducts = (reports?.topProducts || [])
    .map((product) => ({
      label: product.title,
      count: Number(product.rental_count),
    }))
    .filter(({ count }) => count > 0);
  const byCategory = (reports?.rentalsByCategory || [])
    .map((entry) => ({
      label: entry.category || "Uncategorized",
      count: Number(entry.count),
    }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <WorkspacePage
      title="Reports & analytics"
      description="Track marketplace totals and see which listings and categories are rented most."
    >
      {failed ? (
        <section role="alert" className="workspace-surface">
          <WorkspaceEmpty icon={BarChart3} title="Couldn’t load reports">
            <p>Check your connection and try again.</p>
            <button
              className={`${adminActionClass} mt-4`}
              onClick={() => setAttempt((value) => value + 1)}
            >
              Try again
            </button>
          </WorkspaceEmpty>
        </section>
      ) : (
        <>
          <dl
            aria-busy={loading}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {METRICS.map(([key, label, Icon]) => (
              <div
                className="workspace-surface grid min-w-0 gap-2 p-3 sm:p-4"
                key={key}
              >
                <dt className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Icon
                    size={16}
                    className="shrink-0 text-[#233f74]"
                    aria-hidden="true"
                  />
                  {label}
                </dt>
                <dd className="text-2xl font-bold tabular-nums text-slate-900">
                  {loading ? (
                    <span className="block h-8 w-12 rounded bg-slate-200 motion-safe:animate-pulse">
                      <span className="sr-only">Loading</span>
                    </span>
                  ) : (
                    formatNumber(stats?.[key] ?? 0)
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {!loading && (
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <RentalBreakdown
                title="Top listings by rentals"
                description="Up to five listings ranked by booking count."
                rows={topProducts}
                empty="Listings will appear here once they receive bookings."
              />
              <RentalBreakdown
                title="Rentals by category"
                description="Booking counts grouped by listing category."
                rows={byCategory}
                empty="Category counts will appear once bookings are recorded."
              />
            </div>
          )}
        </>
      )}
    </WorkspacePage>
  );
}
