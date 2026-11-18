import { useId, useRef, useState } from "react";
import AdminDialog from "./AdminDialog";

export const TERMS_VERSION = "2026-11-19";

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
        <AdminDialog title="TERMS & CONDITIONS" titleClassName="flex-1 text-center font-serif text-xl font-bold text-gray-950" onClose={closeTerms}>
          <article className="font-serif text-sm leading-relaxed text-gray-900">
            <p className="mb-5 border-t-4 border-double border-gray-800 pt-3 text-xs">Last updated: November 19, 2026</p>
            <section className="mb-5">
              <h3 className="mb-2 text-lg font-bold">Introduction</h3>
              <p>Welcome to Rent-A-Way. These Terms and Conditions apply to your use of our website, mobile app, and rental marketplace services. Please read them before creating an account or using the services. By selecting the agreement checkbox during registration, you confirm that you have read and agree to these Terms and Conditions. If you do not agree, you may not create an account. You may save or print a copy for future reference.</p>
            </section>
            <section className="mb-5">
              <h3 className="mb-2 text-lg font-bold">Agreement to Terms and Conditions</h3>
              <p>These Terms and Conditions (the "Terms") govern your use of Rent-A-Way and its content and services. They apply to renters and suppliers who browse listings, publish listings, communicate with other users, or arrange rentals through the platform. Provide accurate account and listing information, keep your login details private, and use the platform lawfully and respectfully. Before confirming a rental, review the price, rental dates, pickup and return arrangements, and conditions shown for the listing. Suppliers must own or have permission to rent out the listed property. Renters must use it as agreed and report damage or a missed handover to the supplier.</p>
            </section>
            <section className="mb-5">
              <h3 className="mb-2 text-lg font-bold">Definitions/Terminology</h3>
              <p>In these Terms, "User", "Visitor", "Client", "Customer", "You", and "Your" refer to a person accessing or using Rent-A-Way. "Renter" refers to a user seeking or booking a rental. "Supplier" refers to a user offering an item, vehicle, or apartment for rent. "Rent-A-Way", "We", "Our", and "Us" refer to the Rent-A-Way platform. "Website" includes our website and mobile app. "Services" refers to the listing, search, communication, and booking features provided through the platform. "Rental" refers to an arrangement between a renter and a supplier. These Terms apply to the platform serving Roxas, Oriental Mindoro, Philippines, subject to applicable Philippine law.</p>
            </section>
            <section className="mb-5">
              <h3 className="mb-2 text-lg font-bold">Intellectual Property Rights</h3>
              <p>You retain ownership of the content you upload, including listing descriptions and photographs. By publishing a listing, you authorize Rent-A-Way to display that content as needed to provide the marketplace services. Rent-A-Way and its licensors retain their rights in the platform design, branding, software, and other content they provide. You may access and use the platform content for the intended rental services. Upload only content you own or have permission to use, and respect the intellectual property rights of others.</p>
            </section>
          </article>
        </AdminDialog>
      )}
    </div>
  );
}
