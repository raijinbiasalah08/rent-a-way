import { Search } from "lucide-react";

export function matchesListing(listing, query) {
  const term = query.trim().toLowerCase();
  return [listing.title, listing.category].some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(term),
  );
}

export default function ListingSearch({ label, query, onChange, count }) {
  return (
    <div className="workspace-surface flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4">
      <label className="relative w-full sm:max-w-md">
        <span className="sr-only">{label}</span>
        <Search
          size={16}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by title or category"
          className="input min-h-11 pl-9 text-base sm:text-sm"
        />
      </label>
      <span role="status" className="text-xs font-semibold text-slate-600">
        {count} {count === 1 ? "listing" : "listings"}
      </span>
    </div>
  );
}
