import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { toggleProduct } from "../../api/admin";
import { apiAssetUrl } from "../../config";
import toast from "react-hot-toast";
import usePagedList from "../../hooks/usePagedList";
import AdminRecords, {
  AdminBadge,
  adminActionClass,
} from "../../components/AdminRecords";
import AdminDialog from "../../components/AdminDialog";

export default function Products() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const list = usePagedList("/admin/products", { search });

  const handleToggle = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await toggleProduct(selected.id);
      toast.success(
        selected.is_active ? "Listing deactivated" : "Listing activated",
      );
      setSelected(null);
      list.reload();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Could not update this listing. Try again.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const columns = [
    {
      key: "product",
      label: "Product",
      render: (p) => (
        <Link
          to={`/product/${p.id}`}
          className="flex min-w-0 items-center gap-3 font-semibold text-[#1e3a8a] hover:underline"
        >
          <img
            src={
              p.primary_image
                ? apiAssetUrl(p.primary_image)
                : "/placeholder.svg"
            }
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/placeholder.svg";
            }}
          />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            {p.title}
          </span>
        </Link>
      ),
    },
    {
      key: "supplier",
      label: "Supplier",
      wide: true,
      render: (p) => p.supplier_name || "—",
    },
    {
      key: "category",
      label: "Category",
      render: (p) => (
        <AdminBadge className="bg-violet-50 text-violet-700">
          {p.category || "Uncategorised"}
        </AdminBadge>
      ),
    },
    {
      key: "price",
      label: "Daily rate",
      render: (p) => (
        <span className="font-bold text-slate-900">
          ₱{Number(p.price_per_day || 0).toLocaleString("en-PH")}
          <span className="text-xs font-normal text-slate-500"> / day</span>
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (p) => (
        <AdminBadge
          className={
            p.is_active
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }
        >
          {p.is_active ? "Active" : "Inactive"}
        </AdminBadge>
      ),
    },
    {
      key: "actions",
      label: "Manage listing",
      wide: true,
      render: (p) => (
        <button onClick={() => setSelected(p)} className={adminActionClass}>
          {p.is_active ? "Deactivate listing" : "Activate listing"}
        </button>
      ),
    },
  ];
  return (
    <AdminRecords
      title="Manage products"
      description="Review equipment, daily rates, and listing visibility."
      noun="products"
      icon={Package}
      list={list}
      columns={columns}
      search={search}
      setSearch={setSearch}
      searchLabel="Search by product or supplier"
      filtered={Boolean(search)}
      onReset={() => setSearch("")}
    >
      {selected && (
        <AdminDialog
          title={
            selected.is_active
              ? "Deactivate this listing?"
              : "Activate this listing?"
          }
          busy={saving}
          onClose={() => setSelected(null)}
        >
          <p className="break-words text-sm leading-relaxed text-slate-600">
            <strong>{selected.title}</strong>
            {selected.is_active
              ? " will be hidden from rental searches. You can activate it again later."
              : " will be visible in rental searches."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleToggle}
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
            <button
              disabled={saving}
              onClick={() => setSelected(null)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </AdminDialog>
      )}
    </AdminRecords>
  );
}
