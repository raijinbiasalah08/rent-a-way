import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStats, getAdminRentals } from '../../api/admin';
import LoadingSpinner from '../../components/LoadingSpinner';

const NAV_CARDS = [
  { path: 'users', label: 'Users', emoji: '👥', desc: 'Manage all accounts' },
  { path: 'products', label: 'Products', emoji: '📦', desc: 'Moderate listings' },
  { path: 'rentals', label: 'Rentals', emoji: '📋', desc: 'Track all bookings' },
  { path: 'payments', label: 'Payments', emoji: '💳', desc: 'Payment records' },
  { path: 'complaints', label: 'Complaints', emoji: '⚠️', desc: 'Handle reports' },
  { path: 'reports', label: 'Reports', emoji: '📊', desc: 'Analytics & charts' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getAdminRentals()])
      .then(([statsRes, rentalsRes]) => {
        setStats(statsRes.data?.data || {});
        setRentals((rentalsRes.data?.data || []).slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;

  const KPI_CARDS = [
    { label: 'Total Users', value: stats?.total_users ?? 0, color: 'text-navy-700', emoji: '👥' },
    { label: 'Products', value: stats?.total_products ?? 0, color: 'text-blue-600', emoji: '📦' },
    { label: 'Active Rentals', value: stats?.active_rentals ?? 0, color: 'text-green-600', emoji: '✅' },
    { label: 'Pending', value: stats?.pending_rentals ?? 0, color: 'text-yellow-600', emoji: '⏳' },
    { label: 'Revenue', value: `₱${((stats?.total_revenue ?? 0) / 1000).toFixed(1)}k`, color: 'text-emerald-600', emoji: '💰' },
    { label: 'Complaints', value: stats?.open_complaints ?? 0, color: 'text-red-600', emoji: '⚠️' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-navy-700 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute right-6 top-4 text-6xl opacity-10">🔧</div>
        <h1 className="text-3xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-cream-200 opacity-80">Welcome back, {user?.name}. Here's the platform overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {KPI_CARDS.map(k => (
          <div key={k.label} className="card text-center hover:shadow-md transition p-4">
            <div className="text-2xl mb-1">{k.emoji}</div>
            <div className={`text-2xl font-extrabold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Nav */}
      <h2 className="text-lg font-bold text-navy-700 mb-4">Quick Navigation</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {NAV_CARDS.map(({ path, label, emoji, desc }) => (
          <Link key={path} to={`/admin/${path}`}
            className="card text-center hover:shadow-md hover:border-navy-400 transition group p-4">
            <div className="text-3xl mb-2">{emoji}</div>
            <p className="font-semibold text-navy-700 group-hover:text-navy-900 text-sm">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent Rentals */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-navy-700 text-lg">Recent Rentals</h2>
          <Link to="/admin/rentals" className="text-sm text-navy-600 hover:underline">View All →</Link>
        </div>
        {rentals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cream-300 text-gray-500">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Dates</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rentals.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-cream-50">
                    <td className="py-3 font-medium">{r.product_title || 'Product'}</td>
                    <td className="py-3 text-gray-600">{r.customer_name || 'Customer'}</td>
                    <td className="py-3 text-gray-500 text-xs">
                      {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-semibold text-navy-700">₱{r.total_price?.toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`badge badge-${r.status}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-6">No rentals yet.</p>
        )}
      </div>
    </div>
  );
}