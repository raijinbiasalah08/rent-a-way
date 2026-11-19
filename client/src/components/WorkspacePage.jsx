export default function WorkspacePage({ title, description, action, children }) {
  return (
    <div className="ledger-content">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            {description}
          </p>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

export function WorkspaceEmpty({ icon: Icon, title, children }) {
  return (
    <div className="grid justify-items-center gap-2 px-4 py-10 text-center sm:py-12">
      <span className="mb-1 grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
        <Icon size={20} aria-hidden="true" />
      </span>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="max-w-sm text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </div>
  );
}
