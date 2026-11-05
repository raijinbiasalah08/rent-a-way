import { Link } from "react-router-dom";
export default function Help() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[#0f172a] mb-6">
        How Rent-A-Way works
      </h1>
      <div className="card space-y-6">
        <section>
          <h2 className="font-bold text-lg">1. Find equipment</h2>
          <p>
            Browse listings or use the Roxas map. Review the daily rate,
            location, and rental duration.
          </p>
        </section>
        <section>
          <h2 className="font-bold text-lg">2. Request your dates</h2>
          <p>
            Sign in as a customer and send a rental request. Your supplier will
            approve or decline it. Track the result in My Rentals.
          </p>
        </section>
        <section>
          <h2 className="font-bold text-lg">3. Arrange handover</h2>
          <p>
            Message your supplier to confirm the pickup location and equipment
            condition. The supplier records handover in the dashboard.
          </p>
        </section>
        <section>
          <h2 className="font-bold text-lg">4. Return and review</h2>
          <p>
            Mark the item returned. After the supplier verifies the return, you
            can leave a review.
          </p>
        </section>
        <section>
          <h2 className="font-bold text-lg">Need help with a rental?</h2>
          <p>
            Use Message to contact the other participant, or Report issue on a
            rental to contact the platform administrators. Do not share
            passwords or identity documents in community posts.
          </p>
        </section>
        <Link to="/browse" className="btn-primary inline-block">
          Browse equipment
        </Link>
      </div>
    </div>
  );
}
