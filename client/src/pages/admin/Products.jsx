export default function Products() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Manage Products</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead><tr className="border-b"><th className="pb-2">Product</th><th className="pb-2">Supplier</th><th className="pb-2">Price/Day</th><th className="pb-2">Status</th><th className="pb-2">Actions</th></tr></thead>
          <tbody>
            <tr className="border-b"><td className="py-3">Sony A7III</td><td>Supplier Inc.</td><td>₱1,500</td><td><span className="badge-active">Active</span></td><td><button className="text-red-600 hover:underline">Delete</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}