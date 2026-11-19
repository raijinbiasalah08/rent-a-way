import { Link } from "react-router-dom";

export default function LedgerOverview({
  title,
  groups,
  action,
  loading,
  children,
}) {
  return (
    <section className="ledger-overview" aria-label={title}>
      <div className="ledger-heading">
        <h1>{title}</h1>
        {action && (
          <Link className="ledger-action" to={action.to}>
            {action.label}
          </Link>
        )}
      </div>
      <div className="ledger-summary" aria-busy={loading}>
        {groups.map(({ title: groupTitle, items }) => (
          <section className="ledger-panel" key={groupTitle}>
            <h2>{groupTitle}</h2>
            <dl className="ledger-counts">
              {items.map(({ label, value, highlight }) => (
                <div
                  key={label}
                  className={highlight ? "ledger-count-highlight" : undefined}
                >
                  <dt>{label}</dt>
                  <dd>{loading ? "—" : (value ?? "—")}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {children}
    </section>
  );
}
