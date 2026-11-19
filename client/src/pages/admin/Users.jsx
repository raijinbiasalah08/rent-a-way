import api from "../../api/axios";
import { useRef, useState } from "react";
import { Plus, Pencil, Contact, CreditCard } from "lucide-react";
import {
  createAdminUser,
  updateUser,
  reviewSubscription,
} from "../../api/admin";
import toast from "react-hot-toast";
import usePagedList from "../../hooks/usePagedList";
import AdminRecords, {
  AdminBadge,
  AdminFilter,
  adminActionClass,
  adminDate,
} from "../../components/AdminRecords";
import AdminDialog from "../../components/AdminDialog";

const ROLE_COLORS = {
  admin: "bg-rose-50 text-rose-700",
  supplier: "bg-blue-50 text-blue-700",
  customer: "bg-emerald-50 text-emerald-700",
};
const blankUser = () => ({
  name: "",
  email: "",
  password: "",
  role: "customer",
  is_active: 1,
});

export default function Users() {
  const [identity, setIdentity] = useState(null);
  async function viewIdentity(user) {
    try {
      const response = await api.get(`/admin/users/${user.id}/identity`, { responseType: "blob" });
      setIdentity({ name: user.name, url: URL.createObjectURL(response.data) });
    } catch { toast.error("No registration ID is available, or it could not be loaded."); }
  }
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(blankUser);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const savingRef = useRef(false);
  const list = usePagedList("/admin/users", { search, role: roleFilter });

  const openDialog = (mode, user) => {
    setFormError("");
    setForm(user ? { ...user, password: "" } : blankUser());
    setDialog(mode);
  };
  const closeDialog = () => {
    if (!savingRef.current) setDialog(null);
  };
  async function decideSubscription(decision) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setFormError("");
    try {
      await reviewSubscription(form.id, {
        plan: form.requested_plan,
        decision,
        paymentId: form.payment_id,
      });
      toast.success(
        decision === "approve" ? "Subscription activated" : "Request declined",
      );
      setDialog(null);
      list.reload();
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Could not update the subscription.",
      );
      list.reload();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  const change = (key) => (e) =>
    setForm((previous) => ({ ...previous, [key]: e.target.value }));
  const handleSave = async (e) => {
    e.preventDefault();
    if (savingRef.current) return;
    const name = form.name.trim();
    if (!name) {
      setFormError("Enter a name.");
      return;
    }
    if (dialog === "create" && form.password.length < 12) {
      setFormError("Use at least 12 characters for the password.");
      return;
    }
    setFormError("");
    savingRef.current = true;
    setSaving(true);
    try {
      if (dialog === "create") {
        await createAdminUser({
          name,
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
      } else {
        await updateUser(form.id, {
          name,
          role: form.role,
          is_active:
            dialog === "status"
              ? form.is_active
                ? 0
                : 1
              : Number(form.is_active),
        });
      }
      toast.success(dialog === "create" ? "User created" : "User updated");
      setDialog(null);
      list.reload();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Could not save your changes. Please try again.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const columns = [
    {
      key: "account",
      label: "Account",
      render: (u) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-slate-900">{u.name || "Unnamed user"}</span>
          <span className="mt-0.5 block text-xs font-normal text-slate-600">{u.email || "—"}</span>
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (u) => (
        <AdminBadge className={ROLE_COLORS[u.role]}>{u.role}</AdminBadge>
      ),
    },
    {
      key: "status",
      label: "Account status",
      render: (u) => (
        <AdminBadge
          className={
            u.is_active
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }
        >
          {u.is_active ? "Active" : "Suspended"}
        </AdminBadge>
      ),
    },
    { key: "phone", label: "Phone", render: (u) => u.phone || "Not provided" },
    { key: "joined", label: "Joined", render: (u) => adminDate(u.created_at) },
    {
      key: "actions",
      label: "Manage account",
      wide: true,
      render: (u) => (
        <div className="grid gap-1.5">
          <div className="flex flex-wrap gap-1.5 lg:flex-nowrap">
            <button
              onClick={() => openDialog("edit", u)}
              className={adminActionClass}
            >
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
            <button className={adminActionClass} onClick={() => viewIdentity(u)}>
              <Contact size={14} aria-hidden="true" /> View ID
            </button>
            <button
              onClick={() => openDialog("status", u)}
              className={adminActionClass}
            >
              {u.is_active ? "Suspend" : "Reactivate"}
            </button>
          </div>
          {u.role === "supplier" && !!u.is_active && u.requested_package && (
            <button
              onClick={() => openDialog("subscription", u)}
              className={`${adminActionClass} justify-self-start border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100`}
            >
              <CreditCard size={14} aria-hidden="true" /> Review subscription
            </button>
          )}
        </div>
      ),
    },
  ];
  return (
    <>
    {identity && <AdminDialog title={`Registration ID — ${identity.name}`} onClose={() => { URL.revokeObjectURL(identity.url); setIdentity(null); }}><img src={identity.url} alt="Registration ID" className="w-full object-contain" /></AdminDialog>}
    <AdminRecords
      title="Users"
      description="Manage accounts, roles, and access to Rent-A-Way."
      noun="users"
      list={list}
      columns={columns}
      search={search}
      setSearch={setSearch}
      searchLabel="Search by name or email"
      filtered={Boolean(search || roleFilter)}
      onReset={() => {
        setSearch("");
        setRoleFilter("");
      }}
      action={
        <button
          onClick={() => openDialog("create")}
          className="btn-primary min-h-11 text-sm"
        >
          <Plus size={16} aria-hidden="true" />
          Add user
        </button>
      }
      filters={
        <AdminFilter
          label="Account role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="supplier">Supplier</option>
          <option value="customer">Customer</option>
        </AdminFilter>
      }
    >
      {dialog === "subscription" && (
        <AdminDialog
          title="Review subscription"
          busy={saving}
          onClose={closeDialog}
        >
          <p className="text-sm">
            <strong>{form.name}</strong> requested {form.requested_package.name}{" "}
            at ₱{form.payment_amount ?? form.requested_package.monthlyPrice}/month.
          </p>
          {form.payment_reference && (
            <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm">
              GCash reference
              <strong className="block font-mono">
                {form.payment_reference}
              </strong>
            </p>
          )}
          <p className="my-3 text-sm text-slate-600">
            {form.payment_reference
              ? "Match the reference and amount against the incoming GCash transaction."
              : "Confirm receipt of the payment for this earlier request."}{" "}
            Approval records the payment in the admin wallet and activates one
            month of access.
            {form.requested_plan === "business" &&
              " Verify the business before granting its badge."}
          </p>
          {formError && (
            <p role="alert" className="mb-3 text-sm text-red-700">
              {formError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={saving}
              onClick={() => decideSubscription("approve")}
              className="btn-primary"
            >
              Activate for one month
            </button>
            <button
              disabled={saving}
              onClick={() => decideSubscription("decline")}
              className="btn-secondary"
            >
              Decline request
            </button>
          </div>
        </AdminDialog>
      )}
      {dialog && dialog !== "subscription" && (
        <AdminDialog
          title={
            dialog === "create"
              ? "Add a new user"
              : dialog === "edit"
                ? "Edit user"
                : form.is_active
                  ? "Suspend this account?"
                  : "Reactivate this account?"
          }
          busy={saving}
          onClose={closeDialog}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {formError}
              </p>
            )}
            {dialog === "status" ? (
              <p className="break-words text-sm leading-relaxed text-slate-600">
                <strong>{form.name}</strong>
                {form.is_active
                  ? " will lose access to their account. You can reactivate it later."
                  : " will be able to access their account again."}
              </p>
            ) : (
              <>
                <label className="block">
                  <span className="label">Full name</span>
                  <input
                    autoComplete="off"
                    className="input text-base"
                    value={form.name}
                    onChange={change("name")}
                    required
                    disabled={saving}
                  />
                </label>
                {dialog === "create" && (
                  <>
                    <label className="block">
                      <span className="label">Email address</span>
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        autoCapitalize="none"
                        className="input text-base"
                        value={form.email}
                        onChange={change("email")}
                        required
                        disabled={saving}
                      />
                    </label>
                    <label className="block">
                      <span className="label">Password</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className="input text-base"
                        aria-describedby="admin-password-help"
                        value={form.password}
                        onChange={change("password")}
                        required
                        minLength={12}
                        disabled={saving}
                      />
                    </label>
                    <span
                      id="admin-password-help"
                      className="mt-1 block text-xs text-slate-500"
                    >
                      Use at least 12 characters.
                    </span>
                  </>
                )}
                <label className="block">
                  <span id="admin-user-role-label" className="label">
                    Account role
                  </span>
                  <select
                    className="input text-base"
                    aria-labelledby="admin-user-role-label"
                    value={form.role}
                    onChange={change("role")}
                    disabled={saving}
                  >
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                {dialog === "edit" && (
                  <label className="block">
                    <span id="admin-user-status-label" className="label">
                      Account status
                    </span>
                    <select
                      className="input text-base"
                      aria-labelledby="admin-user-status-label"
                      value={Number(form.is_active)}
                      onChange={change("is_active")}
                      disabled={saving}
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Suspended</option>
                    </select>
                  </label>
                )}
              </>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary min-h-11 flex-1"
              >
                {saving
                  ? "Saving…"
                  : dialog === "create"
                    ? "Create user"
                    : dialog === "status"
                      ? "Confirm"
                      : "Save changes"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={closeDialog}
                className="btn-secondary min-h-11 flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
    </AdminRecords>
    </>
  );
}
