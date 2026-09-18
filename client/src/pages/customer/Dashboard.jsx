import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRentals } from '../../api/rentals';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_COLORS = {
  pending: 'badge-pending', approved: 'badge-approved',
  active: 'badge-active', completed: 'badge-completed',
  returned: 'badge-returned', cancelled: 'badge-cancelled',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRentals().then(res => setRentals(res.data?.data || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const counts = {
    total: rentals.length,
    active: rentals.filter(r => r.status === 'active').length,
    completed: rentals.filter(r => r.status === 'completed').length,
    pending: rentals.filter(r => r.status === 'pending').length,
  };

  const activeRentals = rentals.filter(r => ['active', 'approved'].includes(r.status));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Greeting */}
      <div className="bg-navy-700 text-white rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute right-6 top-4 text-6xl opacity-20">🏷️</div>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-cream-200 opacity-80">Track your rentals, browse new products, and join the community.</p>
        <Link to="/browse" className="inline-block mt-4 bg-gold text-navy-800 font-bold px-6 py-2 rounded-lg hover:bg-yellow-400 transition">
          Browse Products →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Rentals', value: counts.total, color: 'text-navy-700' },
          { label: 'Active', value: counts.active, color: 'text-green-600' },
          { label: 'Completed', value: counts.completed, color: 'text-gray-600' },
          { label: 'Pending', value: counts.pending, color: 'text-yellow-600' },
        ].map(s => (
          <div key={s.label} className="card text-center hover:shadow-md transition">
            <div className={`text-3xl font-extrabold ${s.color} mb-1`}>{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active Rentals */}
      <h2 className="text-xl font-bold text-navy-700 mb-4">Active & Approved Rentals</h2>
      {loading ? <LoadingSpinner /> : activeRentals.length > 0 ? (
        <div className="space-y-4">
          {activeRentals.map(r => (
            <div key={r.id} className="card flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:shadow-md transition">
              <img
                src={r.primary_image || `https://placehold.co/80x80/1a237e/f5f0dc?text=${encodeURIComponent(r.product_title?.[0] || 'P')}`}
                alt={r.product_title}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                onError={e => { e.target.src = 'https://placehold.co/80x80/1a237e/f5f0dc?text=P'; }}
              />
              <div className="flex-grow">
                <p className="font-semibold text-navy-700">{r.product_title || 'Product'}</p>
                <p className="text-sm text-gray-500">
                  {new Date(r.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} —{' '}
                  {new Date(r.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${STATUS_COLORS[r.status] || 'badge'}`}>
                  {r.status}
                </span>
                <span className="text-navy-700 font-bold">₱{r.total_price?.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-10 text-gray-400">
          <div className="text-4xl mb-3">📦</div>
          <p className="font-medium">No active rentals</p>
          <p className="text-sm mt-1">Start browsing to rent something awesome!</p>
          <Link to="/browse" className="btn-primary mt-4 inline-block text-sm">Browse Products</Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/customer/rentals" className="card text-center hover:shadow-md hover:border-navy-400 transition group">
          <div className="text-3xl mb-2">📋</div>
          <p className="font-semibold text-navy-700 group-hover:text-navy-900">My Rentals</p>
          <p className="text-xs text-gray-500 mt-1">View all rental history</p>
        </Link>
        <Link to="/customer/community" className="card text-center hover:shadow-md hover:border-navy-400 transition group">
          <div className="text-3xl mb-2">💬</div>
          <p className="font-semibold text-navy-700 group-hover:text-navy-900">Community</p>
          <p className="text-xs text-gray-500 mt-1">Share experiences</p>
        </Link>
        <Link to="/customer/profile" className="card text-center hover:shadow-md hover:border-navy-400 transition group">
          <div className="text-3xl mb-2">👤</div>
          <p className="font-semibold text-navy-700 group-hover:text-navy-900">My Profile</p>
          <p className="text-xs text-gray-500 mt-1">Edit your info</p>
        </Link>
      </div>
    </div>
  );
}