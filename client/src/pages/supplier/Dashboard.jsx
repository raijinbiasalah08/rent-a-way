export default function Dashboard() {
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
}