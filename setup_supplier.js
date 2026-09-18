const fs = require('fs');
const path = require('path');
const clientDir = path.join(__dirname, 'client');

const files = {
  'src/pages/supplier/Dashboard.jsx': `export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Supplier Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center"><div className="text-3xl font-bold text-navy-700">15</div><div className="text-sm text-gray-500">Total Products</div></div>
        <div className="card text-center"><div className="text-3xl font-bold text-green-600">12</div><div className="text-sm text-gray-500">Active Listings</div></div>
        <div className="card text-center"><div className="text-3xl font-bold text-yellow-600">3</div><div className="text-sm text-gray-500">Pending Requests</div></div>
        <div className="card text-center"><div className="text-3xl font-bold text-gold">₱45k</div><div className="text-sm text-gray-500">Total Revenue</div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Recent Requests</h2>
          <div className="card"><p className="text-gray-500 text-sm">No recent requests.</p></div>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="card space-y-3">
            <a href="/supplier/products/new" className="btn-primary block text-center">Add New Product</a>
            <a href="/supplier/rentals" className="btn-outline block text-center">View All Rentals</a>
          </div>
        </div>
      </div>
    </div>
  );
}`,
  'src/pages/supplier/MyProducts.jsx': `import { Link } from 'react-router-dom';
export default function MyProducts() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-navy-700">My Products</h1>
        <Link to="/supplier/products/new" className="btn-primary">Add New Product</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex flex-col p-0 overflow-hidden">
          <div className="h-40 bg-gray-200"></div>
          <div className="p-4 flex-grow">
            <h3 className="font-bold mb-1">Sony A7III</h3>
            <p className="text-sm text-gray-500">₱1,500/day</p>
            <div className="mt-4 flex gap-2">
              <Link to="/supplier/products/1/edit" className="btn-secondary text-xs flex-1 text-center py-1.5">Edit</Link>
              <button className="bg-red-100 text-red-600 font-semibold rounded text-xs flex-1 py-1.5 hover:bg-red-200 transition">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,
  'src/pages/supplier/AddProduct.jsx': `export default function AddProduct() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Add New Product</h1>
      <div className="card space-y-4">
        <div><label className="label">Product Title</label><input type="text" className="input" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Category</label><select className="input"><option>Cameras</option><option>Camping</option></select></div>
          <div><label className="label">Price per Day (₱)</label><input type="number" className="input" /></div>
        </div>
        <div><label className="label">Description</label><textarea className="input h-24"></textarea></div>
        <div><label className="label">Images</label><input type="file" multiple className="input" /></div>
        <button className="btn-primary w-full mt-4">Save Product</button>
      </div>
    </div>
  );
}`,
  'src/pages/supplier/EditProduct.jsx': `export default function EditProduct() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Edit Product</h1>
      <div className="card space-y-4">
        <div><label className="label">Product Title</label><input type="text" className="input" defaultValue="Sony A7III" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Category</label><select className="input"><option>Cameras</option></select></div>
          <div><label className="label">Price per Day (₱)</label><input type="number" className="input" defaultValue="1500" /></div>
        </div>
        <button className="btn-primary w-full mt-4">Update Product</button>
      </div>
    </div>
  );
}`,
  'src/pages/supplier/RentalRequests.jsx': `import { useState } from 'react';
export default function RentalRequests() {
  const [tab, setTab] = useState('Pending');
  const tabs = ['Pending', 'Approved', 'Active', 'Completed'];
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Rental Requests</h1>
      <div className="flex gap-4 mb-6 border-b pb-2 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={\`whitespace-nowrap px-4 py-2 font-semibold \${tab === t ? 'text-navy-700 border-b-2 border-navy-700' : 'text-gray-500'}\`}>{t}</button>
        ))}
      </div>
      <div className="card flex justify-between items-center">
        <div>
          <h3 className="font-bold">Sony A7III requested by John Doe</h3>
          <p className="text-sm text-gray-500">Jan 20 - Jan 22 (3 days) • ₱4,500</p>
        </div>
        {tab === 'Pending' ? (
          <div className="flex gap-2">
            <button className="btn-primary py-1.5 px-4 text-sm">Approve</button>
            <button className="bg-red-100 text-red-600 rounded font-semibold py-1.5 px-4 text-sm">Reject</button>
          </div>
        ) : (
          <span className={\`badge-\${tab.toLowerCase()}\`}>{tab}</span>
        )}
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
console.log('Supplier pages created.');
