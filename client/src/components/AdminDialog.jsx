import { useEffect, useRef, useId } from "react";
import { X } from "lucide-react";

export default function AdminDialog({ title, onClose, busy, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border-0 bg-white p-5 text-slate-800 shadow-xl backdrop:bg-slate-950/50 sm:p-6"
    >
      <header className="mb-5 flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          {title}
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Close dialog"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
