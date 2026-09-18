export default function Complaints() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Manage Complaints</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead><tr className="border-b"><th className="pb-2">Reporter</th><th className="pb-2">Subject</th><th className="pb-2">Date</th><th className="pb-2">Status</th><th className="pb-2">Actions</th></tr></thead>
          <tbody>
            <tr className="border-b"><td className="py-3">John Doe</td><td>Item damaged</td><td>Jan 19, 2024</td><td><span className="badge bg-red-100 text-red-800">Open</span></td><td><button className="text-navy-600">Investigate</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}