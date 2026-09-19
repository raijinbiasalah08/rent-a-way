import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRentals } from '../../api/rentals';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Package, CheckCircle, Clock, LayoutDashboard, Compass, MessageSquare, User, ChevronRight } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200', 
  approved: 'bg-blue-100 text-blue-700 border-blue-200',
  active: 'bg-green-100 text-green-700 border-green-200', 
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  returned: 'bg-purple-100 text-purple-700 border-purple-200', 
  cancelled: 'bg-red-100 text-red-700 border-red-200',
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
    completed: rentals.filter(r => r.status === 'completed' || r.status === 'returned').length,
    pending: rentals.filter(r => r.status === 'pending').length,
  };

  const activeRentals = rentals.filter(r => ['active', 'approved'].includes(r.status));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ── WELCOME BANNER ── */}
      <div className="relative bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] rounded-3xl p-8 sm:p-12 mb-10 overflow-hidden shadow-xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-blue-100 text-lg max-w-xl">
              Track your active rentals, discover new gear, and connect with the community.
            </p>
          </div>
          <Link to="/browse" className="inline-flex items-center gap-2 bg-white text-[#1e3a8a] font-bold px-7 py-3.5 rounded-xl hover:bg-gray-50 hover:scale-105 transition-all shadow-lg hover:shadow-xl w-fit">
            <Compass className="w-5 h-5" /> Explore Catalog
          </Link>
        </div>
      </div>

      {/* ── METRICS GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        {[
          { label: 'Total Rentals', value: counts.total, icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: counts.active, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Completed', value: counts.completed, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Pending', value: counts.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className={`w-12 h-12 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mb-1">{loading ? '-' : s.value}</div>
            <div className="text-sm font-medium text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── ACTIVE RENTALS (Left 2/3) ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Active & Approved Rentals</h2>
            <Link to="/customer/rentals" className="text-sm font-semibold text-[#1e3a8a] hover:underline flex items-center">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 flex justify-center"><LoadingSpinner /></div>
          ) : activeRentals.length > 0 ? (
            <div className="space-y-4">
              {activeRentals.map(r => (
                <div key={r.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-5 items-start sm:items-center hover:shadow-lg transition-all group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={r.primary_image ? (r.primary_image.startsWith('http') ? r.primary_image : `http://localhost:5000${r.primary_image}`) : `https://placehold.co/150x150/1e3a8a/ffffff?text=Product`}
                      alt={r.product_title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{r.product_title || 'Product'}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {new Date(r.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} —{' '}
                      {new Date(r.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-extrabold text-gray-900 text-lg">₱{r.total_price?.toLocaleString()}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No active rentals</h3>
              <p className="text-gray-500 mb-6">You don't have any gear currently rented out.</p>
              <Link to="/browse" className="inline-flex items-center gap-2 bg-[#1e3a8a] text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-[#1d4ed8] transition shadow-sm">
                Start Exploring
              </Link>
            </div>
          )}
        </div>

        {/* ── QUICK ACTIONS (Right 1/3) ── */}
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Link to="/customer/rentals" className="flex items-center gap-4 p-5 hover:bg-gray-50 transition border-b border-gray-50 group">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900">My Rentals</p>
                <p className="text-xs text-gray-500">View complete rental history</p>
              </div>
            </Link>
            <Link to="/customer/community" className="flex items-center gap-4 p-5 hover:bg-gray-50 transition border-b border-gray-50 group">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Community</p>
                <p className="text-xs text-gray-500">Join discussions & share tips</p>
              </div>
            </Link>
            <Link to="/customer/profile" className="flex items-center gap-4 p-5 hover:bg-gray-50 transition group">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Profile Settings</p>
                <p className="text-xs text-gray-500">Update your personal info</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}