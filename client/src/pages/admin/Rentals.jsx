import { useState } from "react";
import { CalendarDays } from "lucide-react";
import usePagedList from "../../hooks/usePagedList";
import AdminRecords, {
  AdminBadge,
  AdminFilter,
  adminDate,
} from "../../components/AdminRecords";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-blue-50 text-blue-700",
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-50 text-red-700",
  declined: "bg-red-50 text-red-700",
  returned: "bg-violet-50 text-violet-700",
};
export default function Rentals() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const list = usePagedList("/admin/rentals", { search, status: statusFilter });
  const columns = [
    {
      key: "product",
      label: "Rental",
      render: (r) => (
        <div>
          <span className="mb-1 block text-[11px] font-medium text-slate-500">
            Booking #{r.id}
          </span>
          {r.product_title || r.title || "Equipment rental"}
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (r) => r.customer_name || "—",
    },
    {
      key: "supplier",
      label: "Supplier",
      render: (r) => r.supplier_name || "—",
    },
    {
      key: "dates",
      label: "Rental period",
      wide: true,
      render: (r) => (
        <span>
          {adminDate(r.start_date)} – {adminDate(r.end_date)}
        </span>
      ),
    },
    {
      key: "total",
      label: "Rental total",
      render: (r) => (
        <span className="font-bold text-slate-900">
          ₱{Number(r.total_price || 0).toLocaleString("en-PH")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <AdminBadge className={STATUS_STYLES[r.status]}>{r.status}</AdminBadge>
      ),
    },
  ];
  return (
    <AdminRecords
      title="Manage rentals"
      description="Keep track of bookings, rental dates, and their progress."
      noun="rentals"
      icon={CalendarDays}
      list={list}
      columns={columns}
      search={search}
      setSearch={setSearch}
      searchLabel="Search product, customer, or supplier"
      filtered={Boolean(search || statusFilter)}
      onReset={() => {
        setSearch("");
        setStatusFilter("");
      }}
      filters={
        <AdminFilter
          label="Rental status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_STYLES).map((status) => (
            <option key={status} value={status}>
              {status[0].toUpperCase() + status.slice(1)}
            </option>
          ))}
        </AdminFilter>
      }
    />
  );
}
