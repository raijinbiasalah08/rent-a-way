export default function Rentals() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Manage Rentals</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead><tr className="border-b"><th className="pb-2">Product</th><th className="pb-2">Customer</th><th className="pb-2">Dates</th><th className="pb-2">Total</th><th className="pb-2">Status</th></tr></thead>
          <tbody>
            <tr className="border-b"><td className="py-3">Sony A7III</td><td>John Doe</td><td>Jan 15 - 18</td><td>₱4,500</td><td><span className="badge-active">Active</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}