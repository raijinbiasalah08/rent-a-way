export default function Users() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Manage Users</h1>
      <div className="card overflow-x-auto">
        <div className="flex justify-between mb-4">
          <input type="text" placeholder="Search users..." className="input max-w-sm" />
          <select className="input w-auto"><option>All Roles</option><option>Customer</option><option>Supplier</option></select>
        </div>
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead><tr className="border-b"><th className="pb-2">Name</th><th className="pb-2">Email</th><th className="pb-2">Role</th><th className="pb-2">Actions</th></tr></thead>
          <tbody>
            <tr className="border-b"><td className="py-3">John Doe</td><td>john@example.com</td><td><span className="badge bg-gray-100 text-gray-800">Customer</span></td><td><button className="text-navy-600 hover:underline">Edit</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}