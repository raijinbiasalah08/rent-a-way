import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QrCode, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { apiAssetUrl } from "../../config";
import WorkspacePage, { WorkspaceEmpty } from "../../components/WorkspacePage";
import AdminDialog from "../../components/AdminDialog";

const pesos = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function ReceiverDialog({ receiver, onSaved, onClose }) {
  const [name, setName] = useState(receiver?.account_name || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save(event) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("accountName", name.trim());
      body.append("qr", file);
      const { data } = await api.put("/admin/wallet/receiver", body);
      onSaved(data.data);
      toast.success("Receiving QR updated");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save the receiving QR. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <AdminDialog title="GCash receiving account" busy={busy} onClose={onClose}>
      <form onSubmit={save} className="space-y-4 text-sm">
        <label className="block font-semibold">
          Account name shown in GCash
          <input
            className="mt-1 w-full rounded-lg border p-3"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block font-semibold">
          Receiving QR image
          <input
            className="mt-2 block w-full"
            type="file"
            required
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const next = e.target.files[0];
              const tooLarge = next?.size > 5 * 1024 * 1024;
              setFile(tooLarge ? null : next);
              setError(tooLarge ? "Choose an image under 5 MB." : "");
            }}
          />
        </label>
        {preview && (
          <img
            className="mx-auto max-h-48 object-contain"
            src={preview}
            alt="Selected receiving QR"
          />
        )}
        <p className="text-slate-600">
          Upload the official receiving QR for this account. Suppliers will use
          it for both paid plans. Use a QR that lets the payer enter the amount.
        </p>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <button
          className="btn-primary w-full"
          disabled={busy || !file || !name.trim()}
        >
          {busy ? "Saving…" : "Save receiving account"}
        </button>
      </form>
    </AdminDialog>
  );
}

export default function Wallet() {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [wallet, setWallet] = useState(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    setWallet(null);
    api
      .get("/admin/wallet", {
        params: { page, limit: 20 },
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!controller.signal.aborted) setWallet(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [page, retry]);
  return (
    <WorkspacePage
      title="Subscription wallet"
      description="Track subscription payments confirmed by your admin team."
      action={
        <Link className="workspace-secondary" to="/admin/users">
          Review subscriptions
        </Link>
      }
    >
      {failed ? (
        <div role="alert">
          Could not load the wallet.{" "}
          <button
            className="workspace-secondary"
            onClick={() => setRetry(retry + 1)}
          >
            Try again
          </button>
        </div>
      ) : !wallet ? (
        <p role="status">Loading wallet…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl bg-slate-900 p-5 text-white">
              <h2 className="text-sm text-slate-200">Total collected</h2>
              <p className="my-2 text-3xl font-bold tabular-nums">
                {pesos.format(wallet.summary.collected)}
              </p>
              <p className="text-sm text-slate-200">
                {wallet.summary.payments} confirmed{" "}
                {Number(wallet.summary.payments) === 1 ? "payment" : "payments"}
              </p>
            </section>
            <section className="workspace-surface flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <QrCode size={18} /> GCash receiving account
                </h2>
                <p className="my-2 text-sm text-slate-600">
                  {wallet.receiver?.account_name ||
                    "Set up the account suppliers will pay."}
                </p>
                <button
                  className="workspace-secondary"
                  onClick={() => setEditing(true)}
                >
                  {wallet.receiver
                    ? "Change receiving account"
                    : "Set up GCash QR"}
                </button>
              </div>
              {wallet.receiver && (
                <a
                  href={apiAssetUrl(wallet.receiver.qr_url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    className="h-20 w-20 object-contain"
                    alt="View receiving QR at full size"
                    src={apiAssetUrl(wallet.receiver.qr_url)}
                  />
                </a>
              )}
            </section>
          </div>
          <section className="workspace-surface overflow-hidden">
            <h2 className="border-b p-4 font-semibold">Confirmed payments</h2>
            {wallet.data.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      {[
                        "Confirmed",
                        "Supplier",
                        "Plan",
                        "Reference",
                        "Amount",
                      ].map((label) => (
                        <th scope="col" className="px-4 py-3" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wallet.data.map((row) => (
                      <tr className="border-t" key={row.id}>
                        <td className="whitespace-nowrap px-4 py-3">
                          {new Date(row.reviewed_at).toLocaleDateString(
                            "en-PH",
                          )}
                        </td>
                        <td className="px-4">{row.supplier}</td>
                        <td className="px-4">
                          {row.plan === "student"
                            ? "Premium Student"
                            : "Premium Business"}
                        </td>
                        <td className="px-4">
                          {row.reference || "Manual confirmation"}
                        </td>
                        <td className="px-4 font-semibold">
                          {pesos.format(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <WorkspaceEmpty icon={Receipt} title="No confirmed payments yet">
                Payments appear here when an admin confirms a supplier’s
                subscription.
              </WorkspaceEmpty>
            )}
            {wallet.pagination.totalPages > 1 && (
              <div className="flex items-center justify-end gap-3 border-t p-3 text-sm">
                <button
                  className="workspace-secondary"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                Page {page} of {wallet.pagination.totalPages}
                <button
                  className="workspace-secondary"
                  disabled={page >= wallet.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </section>
          {editing && (
            <ReceiverDialog
              receiver={wallet.receiver}
              onClose={() => setEditing(false)}
              onSaved={(receiver) => {
                setWallet({ ...wallet, receiver });
                setEditing(false);
              }}
            />
          )}
        </>
      )}
    </WorkspacePage>
  );
}
