import { Link, NavLink } from "react-router-dom";
import { useId } from "react";
import {
  ArrowLeft,
  Search,
  X,
  Inbox,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const adminActionClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#1e3a8a] transition hover:bg-blue-50 disabled:opacity-50";

export function AdminBadge({
  children,
  className = "bg-slate-100 text-slate-700",
}) {
  return (
    <span
      className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {children}
    </span>
  );
}

export function adminDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export default function AdminRecords({
  title,
  description,
  noun,
  icon: Icon,
  list,
  columns,
  search,
  setSearch,
  searchLabel,
  filters,
  filtered,
  onReset,
  action,
  children,
}) {
  const { data, loading, error, page, totalPages, setPage, reload } = list;
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-3 pb-8 pt-5 sm:px-6 sm:pt-8">
      <Link
        to="/admin/dashboard"
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-800"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Admin overview
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Administration
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f1729] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
        {action && (
          <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
            {action}
          </div>
        )}
      </header>
      <nav
        aria-label="Admin sections"
        className="mb-5 hidden flex-wrap gap-2 md:flex"
      >
        {[
          ["users", "Users"],
          ["products", "Products"],
          ["rentals", "Rentals"],
        ].map(([path, label]) => (
          <NavLink
            key={path}
            to={`/admin/${path}`}
            className={({ isActive }) =>
              `rounded-xl px-4 py-3 text-sm font-semibold ${isActive ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600 hover:bg-blue-50"}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <section
        aria-label={`${title} records`}
        className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor={`admin-${noun}-search`}
                className="mb-2 block text-xs font-semibold text-slate-600"
              >
                {searchLabel}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id={`admin-${noun}-search`}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${noun}…`}
                  className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    className="absolute right-1 top-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            {filters}
          </div>
          {filtered && (
            <button
              type="button"
              onClick={onReset}
              className="mt-2 min-h-11 rounded-lg text-sm font-semibold text-blue-800"
            >
              Reset filters
            </button>
          )}
        </div>
        <div aria-busy={loading}>
          {loading ? (
            <div role="status" className="space-y-3 p-5">
              <p className="text-sm text-slate-500">Loading {noun}…</p>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-24 rounded-xl bg-slate-100 motion-safe:animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="px-6 py-12 text-center">
              <AlertCircle className="mx-auto mb-3 text-red-500" />
              <h2 className="font-semibold text-slate-900">
                Couldn’t load {noun}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Check your connection and try again.
              </p>
              <button onClick={reload} className={`${adminActionClass} mt-5`}>
                Try again
              </button>
            </div>
          ) : !data.length ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
                <Inbox size={26} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                {filtered ? "No matching records" : `No ${noun} yet`}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                {filtered
                  ? "Try a different search or reset your filters."
                  : `New ${noun} will appear here when they’re created.`}
              </p>
              {filtered && (
                <button
                  onClick={onReset}
                  className={`${adminActionClass} mt-5`}
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3 bg-slate-50/60 p-3 lg:hidden">
                {data.map((record) => (
                  <article
                    key={record.id}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mb-4 flex min-w-0 items-start gap-3 border-b border-slate-100 pb-4">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                        <Icon size={18} aria-hidden="true" />
                      </div>
                      <h2 className="min-w-0 flex-1 break-words text-base font-semibold text-slate-900 [overflow-wrap:anywhere]">
                        {columns[0].render(record)}
                      </h2>
                    </div>
                    <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4">
                      {columns.slice(1).map((column) => (
                        <div
                          key={column.key}
                          className={`min-w-0 ${column.wide ? "col-span-2" : ""}`}
                        >
                          <dt className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {column.label}
                          </dt>
                          <dd className="break-words text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">
                            {column.render(record)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <caption className="sr-only">{title}</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <tr>
                      {columns.map((column) => (
                        <th
                          scope="col"
                          key={column.key}
                          className="px-5 py-4 font-semibold"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50">
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className="max-w-xs break-words px-5 py-4 text-slate-700 [overflow-wrap:anywhere]"
                          >
                            {column.render(record)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        {!loading && !error && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-4 sm:px-5">
            <p role="status" className="text-xs text-slate-500">
              {data.length} {noun} on this page
            </p>
            {totalPages > 1 && (
              <nav
                aria-label="Result pages"
                className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start"
              >
                <button
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className={adminActionClass}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  aria-label="Next page"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className={adminActionClass}
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </div>
        )}
      </section>
      {children}
    </div>
  );
}

export function AdminFilter({ label, value, onChange, children }) {
  const id = useId();
  return (
    <label className="block min-w-0 sm:w-44">
      <span id={id} className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      <select
        aria-labelledby={id}
        value={value}
        onChange={onChange}
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}
