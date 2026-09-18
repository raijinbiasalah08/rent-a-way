export default function Payments() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Manage Payments</h1>
      <div className="card mb-6 flex justify-between items-center"><span className="font-bold text-lg">Total Processed:</span><span className="text-2xl font-bold text-green-600">₱890,500</span></div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead><tr className="border-b"><th className="pb-2">Transaction ID</th><th className="pb-2">Rental</th><th className="pb-2">Amount</th><th className="pb-2">Method</th><th className="pb-2">Status</th></tr></thead>
          <tbody>
            <tr className="border-b"><td className="py-3">TXN-123456</td><td>Sony A7III</td><td>₱4,500</td><td>GCash</td><td><span className="badge-completed">Success</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}