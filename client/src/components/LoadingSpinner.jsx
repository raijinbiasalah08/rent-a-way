export default function LoadingSpinner() {
  return (
    <div
      role="status"
      className="flex justify-center items-center gap-3 p-8 text-sm font-medium text-slate-600"
    >
      <span
        aria-hidden="true"
        className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-navy-700"
      />
      Loading…
    </div>
  );
}
