import { useState } from "react";
import { Check } from "lucide-react";
import AdminDialog from "./AdminDialog";
import api from "../api/axios";

export default function SubscriptionDialog({ status, onUpdate, onClose }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { packages, currentPlan, requestedPlan, expiresAt } = status;
  const pending = packages.find((pkg) => pkg.id === requestedPlan);
  const opportunity =
    currentPlan === "business" ? "Business advertising" : "Featured listing";

  async function requestPlan(plan) {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put("/subscriptions/request", { plan });
      onUpdate(data.data);
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
                disabled={saving || pkg.id === requestedPlan}
                onClick={() => requestPlan(pkg.id)}
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
          ? `Your ${pending.name} request is pending. Contact the supplier team to arrange payment.`
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
    </AdminDialog>
  );
}
