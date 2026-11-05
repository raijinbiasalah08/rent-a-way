export default function PageControls({ page, totalPages, setPage, loading }) {
  return (
    <nav
      aria-label="Result pages"
      className="flex items-center justify-end gap-3 my-4 text-sm"
    >
      <button
        className="btn-secondary"
        disabled={loading || page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        className="btn-secondary"
        disabled={loading || page >= totalPages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
