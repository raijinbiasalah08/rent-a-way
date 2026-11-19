import { useId } from "react";
import WorkspacePage, { WorkspaceEmpty } from "./WorkspacePage";
import {
  Search,
  X,
  Inbox,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const adminActionClass =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50";

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
  emptyDescription,
  children,
}) {
  const { data, loading, error, page, totalPages, setPage, reload } = list;
  return (
    <WorkspacePage title={title} description={description} action={action}>
      <section
        aria-label={`${title} records`}
        className="workspace-surface min-w-0 overflow-hidden"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            {setSearch && (
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`admin-${noun}-search`}
                  className="mb-2 block text-xs font-semibold text-slate-600"
                >
                  {searchLabel}
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id={`admin-${noun}-search`}
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${noun}…`}
                    className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white pl-9 pr-11 text-base focus:border-blue-600 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setSearch("")}
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
            {filters}
          </div>
          {filtered && setSearch && (
            <button
              type="button"
              onClick={onReset}
              className="min-h-11 rounded-lg px-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
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
            <WorkspaceEmpty
              icon={Inbox}
              title={filtered ? `No matching ${noun}` : `No ${noun} yet`}
            >
              <p>
                {filtered
                  ? "Change or clear your filters to see more results."
                  : emptyDescription || `New ${noun} will appear here.`}
              </p>
              {filtered && (
                <button
                  onClick={onReset}
                  className={`${adminActionClass} mt-5`}
                >
                  Reset filters
                </button>
              )}
            </WorkspaceEmpty>
          ) : (
            <>
              <div className="space-y-3 bg-slate-50/60 p-3 lg:hidden">
                {data.map((record) => (
                  <article
                    key={record.id}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mb-3 flex min-w-0 items-center gap-3 border-b border-slate-100 pb-3">
                      {Icon && (
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                          <Icon size={18} aria-hidden="true" />
                        </div>
                      )}
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
                <table className="admin-table w-full text-left text-sm">
                  <caption className="sr-only">{title}</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <tr>
                      {columns.map((column) => (
                        <th
                          scope="col"
                          key={column.key}
                          className="px-4 py-3 font-semibold"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((record) => (
                      <tr
                        key={record.id}
                        className="transition-colors hover:bg-slate-50 focus-within:bg-slate-50"
                      >
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className="max-w-xs break-words px-4 py-3 text-slate-700 [overflow-wrap:anywhere]"
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
        {!loading && !error && (data.length > 0 || totalPages > 1) && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
            <p role="status" className="text-xs text-slate-500">
              {data.length} {data.length === 1 ? noun.slice(0, -1) : noun}
              {totalPages > 1 ? " on this page" : ""}
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
    </WorkspacePage>
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
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base focus:border-blue-600 sm:text-sm"
      >
        {children}
      </select>
    </label>
  );
}
