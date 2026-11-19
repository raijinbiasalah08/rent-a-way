import { useRef, useState } from "react";
import { updateComplaint } from "../../api/admin";
import toast from "react-hot-toast";
import usePagedList from "../../hooks/usePagedList";
import AdminDialog from "../../components/AdminDialog";
import AdminRecords, {
  AdminBadge,
  adminActionClass,
  adminDate,
} from "../../components/AdminRecords";

const STATUS_STYLES = {
  open: "bg-red-100 text-red-700",
  investigating: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
};

export default function Complaints() {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  const list = usePagedList("/admin/complaints", { status: filter });
  const updatingRef = useRef(false);

  const handleUpdateStatus = async (id, status) => {
    if (updatingRef.current) return;
    updatingRef.current = true;
    setUpdating(true);
    try {
      await updateComplaint(id, { status });
      toast.success(`Complaint marked as ${status}`);
      setSelected(null);
      list.reload();
    } catch {
      toast.error("Failed to update complaint");
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  };

  const statuses = Object.keys(STATUS_STYLES);
  const columns = [
    {
      key: "subject",
      label: "Complaint",
      render: (complaint) => (
        <span className="font-semibold text-slate-900">
          {complaint.subject}
        </span>
      ),
    },
    {
      key: "reporter",
      label: "Reporter",
      render: (c) => c.reporter_name || "—",
    },
    {
      key: "details",
      label: "Details",
      wide: true,
      render: (c) => <span className="line-clamp-2">{c.details || "—"}</span>,
    },
    { key: "date", label: "Reported", render: (c) => adminDate(c.created_at) },
    {
      key: "status",
      label: "Status",
      render: (c) => (
        <AdminBadge className={STATUS_STYLES[c.status]}>{c.status}</AdminBadge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      wide: true,
      render: (c) => (
        <button className={adminActionClass} onClick={() => setSelected(c)}>
          Review complaint
        </button>
      ),
    },
  ];

  return (
    <AdminRecords
      title="Complaints"
      description="Review reported issues and track how each case is handled."
      noun="complaints"
      list={list}
      columns={columns}
      filtered={Boolean(filter)}
      onReset={() => setFilter("")}
      emptyDescription="New reports from renters and suppliers will appear here."
      filters={
        <fieldset className="min-w-0">
          <legend className="mb-2 text-xs font-semibold text-slate-600">
            Complaint status
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {["", ...statuses].map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={filter === status}
                onClick={() => setFilter(status)}
                className="min-h-11 rounded-lg px-3 text-xs font-semibold capitalize text-slate-700 hover:bg-slate-100 aria-pressed:bg-[#14263f] aria-pressed:text-white"
              >
                {status || "All statuses"}
              </button>
            ))}
          </div>
        </fieldset>
      }
    >
      {selected && (
        <AdminDialog
          title={selected.subject}
          busy={updating}
          onClose={() => setSelected(null)}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <AdminBadge className={STATUS_STYLES[selected.status]}>
              {selected.status}
            </AdminBadge>
            <span>
              Reported by {selected.reporter_name} ·{" "}
              {adminDate(selected.created_at)}
            </span>
          </div>
          <p className="my-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed [overflow-wrap:anywhere]">
            {selected.details || "No details provided."}
          </p>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-800">
              {updating ? "Updating status…" : "Update status"}
            </legend>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={updating || selected.status === status}
                  onClick={() => handleUpdateStatus(selected.id, status)}
                  className={`${adminActionClass} capitalize`}
                >
                  {status}
                </button>
              ))}
            </div>
          </fieldset>
        </AdminDialog>
      )}
    </AdminRecords>
  );
}
