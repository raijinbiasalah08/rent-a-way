import { useState } from "react";
import { Check } from "lucide-react";
import AdminDialog from "./AdminDialog";
import api from "../api/axios";
import { apiAssetUrl } from "../config";

export default function SubscriptionDialog({ status, onUpdate, onClose }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState(null);
  const [reference, setReference] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const { packages, currentPlan, requestedPlan, expiresAt } = status;
  const pending = packages.find((pkg) => pkg.id === requestedPlan);
  const opportunity =
    currentPlan === "business" ? "Business advertising" : "Featured listing";

  async function requestPlan(event, manual = false) {
    event?.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put("/subscriptions/request", {
        plan: checkout.id,
        ...(reference && !manual ? { reference } : {}),
      });
      onUpdate(data.data);
      setCheckout(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not request this plan. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog
      title="Subscription Packages"
      onClose={onClose}
      busy={saving}
      wide
    >
      {!status.canPublish && (
        <p className="mb-5 text-sm text-slate-600">
          Your free listing slot is in use. Choose a premium plan to publish
          another item.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {packages.map((pkg) => (
          <section
            key={pkg.id}
            className={`flex flex-col rounded-xl border p-4 ${pkg.id === currentPlan ? "border-blue-300 bg-blue-50/50" : "border-slate-200"}`}
          >
            <h3 className="font-semibold text-slate-800">{pkg.name}</h3>
            <p className="my-3">
              <strong className="text-3xl text-[#182d57]">
                ₱{pkg.monthlyPrice}
              </strong>
              <span className="text-sm text-slate-600">/month</span>
            </p>
            <ul className="mb-4 space-y-2 text-sm text-slate-700">
              {pkg.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <Check
                    aria-hidden="true"
                    size={16}
                    className="mt-0.5 shrink-0 text-teal-700"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
            {pkg.id === currentPlan && (
              <p className="mt-auto py-2 text-sm font-semibold text-blue-800">
                Current plan
                {expiresAt &&
                  ` · Until ${new Date(expiresAt).toLocaleDateString("en-PH")}`}
              </p>
            )}
            {pkg.id !== "free" && (
              <button
                type="button"
                className="btn-primary mt-auto min-h-11 text-sm disabled:opacity-60"
                disabled={saving || Boolean(requestedPlan)}
                onClick={() => {
                  setCheckout(pkg);
                  setReference("");
                  setShowQr(false);
                  setQrFailed(false);
                  setError("");
                }}
              >
                {pkg.id === requestedPlan
                  ? "Request pending"
                  : pkg.id === currentPlan
                    ? "Request renewal"
                    : `Request ${pkg.name}`}
              </button>
            )}
          </section>
        ))}
      </div>
      <p role="status" className="mt-5 text-sm text-slate-600">
        {pending
          ? `Your ${pending.name} request is awaiting admin verification. Please wait for review before making another payment.`
          : "Paid plans activate for one month after payment confirmation. When a plan expires, existing listings stay visible and the free upload limit applies."}
        {pending && (
          <a
            href="mailto:suppliers@rentaway.ph"
            className="ml-1 font-semibold text-blue-800 underline"
          >
            Contact supplier team
          </a>
        )}
      </p>
      {currentPlan !== "free" && (
        <a
          className="mt-3 inline-block text-sm font-semibold text-blue-800 underline"
          href={`mailto:suppliers@rentaway.ph?subject=${encodeURIComponent(opportunity + " inquiry")}`}
        >
          Ask about {opportunity.toLowerCase()} opportunities
        </a>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {checkout && (
        <AdminDialog
          title="Pay with GCash"
          busy={saving}
          onClose={() => {
            if (!saving) {
              setCheckout(null);
              setError("");
            }
          }}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => requestPlan(event)}
          >
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
              <span>
                {checkout.name}
                <small className="block text-slate-600">One month</small>
              </span>
              <strong className="text-2xl">₱{checkout.monthlyPrice}</strong>
            </div>
            {status.receiver ? (
              <>
                <p className="text-sm text-slate-700">
                  Send ₱{checkout.monthlyPrice} to{" "}
                  <strong>{status.receiver.account_name}</strong>. Check the
                  recipient in GCash before paying.
                </p>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  aria-expanded={showQr}
                  onClick={() => setShowQr(!showQr)}
                >
                  {showQr ? "Hide" : "Show"} GCash QR code
                </button>
                {showQr && (
                  <div className="rounded-xl border border-slate-200 p-3 text-center">
                    {qrFailed ? (
                      <p role="alert">The QR image could not load.</p>
                    ) : (
                      <img
                        src={apiAssetUrl(status.receiver.qr_url)}
                        onError={() => setQrFailed(true)}
                        alt="GCash receiving QR code"
                        className="mx-auto h-auto max-h-72 max-w-full object-contain"
                      />
                    )}
                    <a
                      href={apiAssetUrl(status.receiver.qr_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-blue-800 underline"
                    >
                      Open full-size QR image
                    </a>
                    <p className="mt-2 text-xs text-slate-600">
                      On one phone, save the image and select it in the GCash
                      QR scanner.
                    </p>
                  </div>
                )}
                <label className="block text-sm font-semibold">
                  GCash payment reference
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={50}
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 p-3"
                    placeholder="Reference number on your receipt"
                  />
                </label>
                <button
                  disabled={
                    saving || !/^\d{10,20}$/.test(reference.replace(/[ -]/g, ""))
                  }
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {saving ? "Submitting…" : "Submit for admin verification"}
                </button>
              </>
            ) : (
              <div
                role="status"
                className="rounded-lg bg-amber-50 p-3 text-sm"
              >
                <p>
                  The GCash receiving account has not been set up yet. Contact
                  the team to arrange payment, then submit the request for
                  manual review.
                </p>
                <a
                  href="mailto:suppliers@rentaway.ph?subject=Subscription%20payment"
                  className="my-2 inline-block font-semibold text-blue-800 underline"
                >
                  Contact supplier team
                </a>
                <button
                  type="button"
                  disabled={saving}
                  onClick={(event) => requestPlan(event, true)}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {saving ? "Submitting…" : "Request plan for manual confirmation"}
                </button>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setCheckout(null);
                setError("");
              }}
              className="btn-secondary w-full"
            >
              Back to plans
            </button>
          </form>
        </AdminDialog>
      )}
    </AdminDialog>
  );
}
