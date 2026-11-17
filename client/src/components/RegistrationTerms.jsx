import { useId, useRef, useState } from "react";
import AdminDialog from "./AdminDialog";

export const TERMS_VERSION = "2026-11-17";

export default function RegistrationTerms({ accepted, onChange }) {
  const [open, setOpen] = useState(false);
  const checkboxId = useId();
  const termsButton = useRef(null);

  function closeTerms() {
    setOpen(false);
    requestAnimationFrame(() => termsButton.current?.focus());
  }

  return (
    <div className="text-sm text-gray-700">
      <div className="flex items-start gap-2 py-1">
        <input
          id={checkboxId}
          type="checkbox"
          required
          checked={accepted}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 accent-blue-800"
        />
        <span>
          <label htmlFor={checkboxId}>
            I agree to the Rent-A-Way
            <span className="sr-only"> Terms &amp; Conditions</span>
          </label>{" "}
          <button
            ref={termsButton}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
            className="font-semibold text-blue-900 underline underline-offset-2 hover:text-blue-700"
          >
            Terms &amp; Conditions
          </button>
          .
        </span>
      </div>
      {open && (
        <AdminDialog title="Terms & Conditions" onClose={closeTerms}>
          <div className="mt-3 space-y-3 leading-relaxed">
            <p>
              <strong>Your account.</strong> Provide accurate contact details,
              keep your login private, and use Rent-A-Way to arrange lawful
              rentals.
            </p>
            <p>
              <strong>Listing equipment.</strong> List only equipment you own or
              have permission to rent out. Describe its condition, availability,
              price, and pickup location accurately.
            </p>
            <p>
              <strong>Renting equipment.</strong> Before confirming a booking,
              check the price, rental dates, pickup and return arrangements, and
              any conditions shown for the item. Use the equipment as agreed and
              report damage or a missed handover to the other party.
            </p>
            <p>
              <strong>Community conduct.</strong> Communicate respectfully. Do
              not post misleading listings, impersonate others, or share another
              person's private information without permission.
            </p>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
