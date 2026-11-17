export const TERMS_VERSION = "2026-11-17";

export default function RegistrationTerms({ accepted, onChange }) {
  return (
    <div className="space-y-2 text-sm text-gray-700">
      <details className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <summary className="cursor-pointer font-semibold text-blue-900">
          Read the Terms and Conditions
        </summary>
        <div className="mt-3 space-y-3 leading-relaxed">
          <p><strong>Your account.</strong> Provide accurate contact details, keep your login private, and use Rent-A-Way to arrange lawful rentals.</p>
          <p><strong>Listing equipment.</strong> List only equipment you own or have permission to rent out. Describe its condition, availability, price, and pickup location accurately.</p>
          <p><strong>Renting equipment.</strong> Before confirming a booking, check the price, rental dates, pickup and return arrangements, and any conditions shown for the item. Use the equipment as agreed and report damage or a missed handover to the other party.</p>
          <p><strong>Community conduct.</strong> Communicate respectfully. Do not post misleading listings, impersonate others, or share another person's private information without permission.</p>
        </div>
      </details>
      <label className="flex items-start gap-2 py-1">
        <input type="checkbox" required checked={accepted}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 accent-blue-800" />
        I agree to the Rent-A-Way Terms and Conditions.
      </label>
    </div>
  );
}
