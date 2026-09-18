const fs = require('fs');
const path = require('path');
const clientDir = path.join(__dirname, 'client');

const files = {
  'src/pages/admin/Dashboard.jsx': `import { Link } from 'react-router-dom';
export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="card text-center p-4"><div className="text-2xl font-bold">1,234</div><div className="text-xs text-gray-500">Users</div></div>
        <div className="card text-center p-4"><div className="text-2xl font-bold">567</div><div className="text-xs text-gray-500">Products</div></div>
        <div className="card text-center p-4"><div className="text-2xl font-bold">89</div><div className="text-xs text-gray-500">Active Rentals</div></div>
        <div className="card text-center p-4"><div className="text-2xl font-bold">12</div><div className="text-xs text-gray-500">Pending Rentals</div></div>
        <div className="card text-center p-4"><div className="text-2xl font-bold text-green-600">₱890k</div><div className="text-xs text-gray-500">Revenue</div></div>
        <div className="card text-center p-4"><div className="text-2xl font-bold text-red-600">3</div><div className="text-xs text-gray-500">Open Complaints</div></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {['users', 'products', 'rentals', 'reports'].map(path => (
          <Link key={path} to={\`/admin/\${path}\`} className="card hover:shadow-md text-center capitalize font-semibold text-navy-700">
            Manage {path}
          </Link>
        ))}
      </div>
      <div className="card">
        <h2 className="font-bold mb-4">Recent Rentals</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="pb-2">Product</th><th className="pb-2">Customer</th><th className="pb-2">Status</th></tr></thead>
          <tbody>
            <tr><td className="py-2">Sony A7III</td><td>John Doe</td><td><span className="badge-active">Active</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}`,
  'src/pages/admin/Users.jsx': `export default function Users() {
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
}`,
  'src/pages/admin/Products.jsx': `export default function Products() {
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
}`,
  'src/pages/admin/Rentals.jsx': `export default function Rentals() {
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
}`,
  'src/pages/admin/Payments.jsx': `export default function Payments() {
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
}`,
  'src/pages/admin/Complaints.jsx': `export default function Complaints() {
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
}`,
  'src/pages/admin/Reports.jsx': `import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
export default function Reports() {
  const data = [
    { name: 'Aug', rev: 4000 },
    { name: 'Sep', rev: 3000 },
    { name: 'Oct', rev: 2000 },
    { name: 'Nov', rev: 2780 },
    { name: 'Dec', rev: 1890 },
    { name: 'Jan', rev: 2390 },
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Reports & Analytics</h1>
      <div className="card mb-8">
        <h2 className="font-bold mb-6 text-lg">Revenue (Last 6 Months)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={v => \`₱\${v}\`} />
              <Tooltip formatter={v => [\`₱\${v}\`, 'Revenue']} />
              <Line type="monotone" dataKey="rev" stroke="#f4c430" strokeWidth={3} dot={{ fill: '#1a237e', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}`
};

Object.keys(files).forEach(file => {
  const fullPath = path.join(clientDir, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, files[file]);
});
console.log('Admin pages created.');
