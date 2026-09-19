import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRentals, updateRentalStatus } from '../../api/rentals';
import { getProducts } from '../../api/products';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Store, TrendingUp, Package, ClipboardList, CheckCircle2, XCircle, Plus, ChevronRight, Calendar, User } from 'lucide-react';

const STATUS_STYLES = {
  pending:   'bg-amber-100 text-amber-700 border-amber-200',
  approved:  'bg-blue-100 text-blue-700 border-blue-200',
  active:    'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const BASE_URL = 'http://localhost:5000';

export default function SupplierDashboard() {
  const { user } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = () => {
    Promise.all([getRentals(), getProducts({ limit: 100 })])
      .then(([rentalsRes, productsRes]) => {
        setRentals(rentalsRes.data?.data || []);
        setProducts(productsRes.data?.data?.products || []);
      })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatus = async (rentalId, status) => {
    setActionLoading(rentalId + status);
    try {
      await updateRentalStatus(rentalId, status);
      toast.success(`Rental ${status}`);
      fetchData();
    } catch {
      toast.error('Failed to update rental');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRentals = rentals.filter(r => r.status === 'pending');
  const activeRentals = rentals.filter(r => r.status === 'active');
  const validRentals = rentals.filter(r => ['approved', 'active', 'completed', 'returned'].includes(r.status));
  
  const totalRevenue = validRentals.reduce((sum, r) => sum + (r.total_price || 0), 0);

  const KPI = [
    { label: 'Total Requests', value: rentals.length, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending', value: pendingRentals.length, icon: ClockIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Active', value: activeRentals.length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Revenue', value: `₱${(totalRevenue / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  // Chart data: Earnings by Product
  const earningsData = Object.values(
    validRentals.reduce((acc, r) => {
      const title = r.product_title || 'Unknown';
      if (!acc[title]) acc[title] = { title, earnings: 0 };
      acc[title].earnings += r.total_price || 0;
      return acc;
    }, {})
  ).sort((a, b) => b.earnings - a.earnings).slice(0, 5); // Top 5

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-[#f8fafc] min-h-screen font-sans">
      {/* ── HEADER BANNER ── */}
      <div className="relative bg-[#0f172a] rounded-3xl p-8 sm:p-12 mb-10 overflow-hidden shadow-2xl">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute right-40 -bottom-20 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
              <Store className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Supplier Dashboard</h1>
              <p className="text-gray-400 mt-1">Manage listings and grow your business, {user?.name.split(' ')[0]}.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/supplier/profile" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-all border border-white/20 backdrop-blur-md">
              <User className="w-4 h-4" /> Edit Profile
            </Link>
            <Link to="/supplier/products/new" className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-500 hover:scale-105 transition-all shadow-lg hover:shadow-blue-600/25 w-fit">
              <Plus className="w-5 h-5" /> Add New Product
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI METRICS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        {KPI.map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
            <div className={`w-12 h-12 rounded-xl ${k.bg} ${k.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <k.icon className="w-6 h-6" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">{loading ? '-' : k.value}</div>
            <div className="text-sm font-medium text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ── LEFT COLUMN (Charts & Active) ── */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Earnings Chart */}
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" /> Top Earning Products
            </h2>
            {loading ? (
              <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>
            ) : earningsData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Package className="w-12 h-12 mb-2 opacity-50" />
                <p>No earnings data yet.</p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={earningsData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={v => `₱${v}`} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis
                      type="category"
                      dataKey="title"
                      width={120}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                      tickFormatter={v => v?.length > 15 ? v.slice(0, 15) + '…' : v}
                    />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(v) => [`₱${v.toLocaleString()}`, 'Earnings']} 
                    />
                    <Bar dataKey="earnings" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Upcoming Bookings Timeline */}
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" /> Upcoming Bookings Schedule
              </h2>
              <Link to="/supplier/rentals" className="text-sm font-semibold text-blue-600 hover:underline">View All</Link>
            </div>
            {loading ? <div className="py-8 flex justify-center"><LoadingSpinner /></div> : validRentals.filter(r => r.status === 'approved' || r.status === 'active').length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No upcoming bookings.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {validRentals
                  .filter(r => r.status === 'approved' || r.status === 'active')
                  .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
                  .slice(0, 5)
                  .map(r => {
                    const start = new Date(r.start_date);
                    const end = new Date(r.end_date);
                    const isToday = new Date().toDateString() === start.toDateString();
                    
                    return (
                      <div key={r.id} className="relative pl-6 border-l-2 border-slate-100 pb-2 group">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${isToday ? 'bg-blue-500' : 'bg-slate-300 group-hover:bg-purple-400'} transition-colors`} />
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group-hover:shadow-md transition">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-slate-200">
                              <img src={r.primary_image ? (r.primary_image.startsWith('http') ? r.primary_image : `http://localhost:5000${r.primary_image}`) : 'https://placehold.co/100'} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm mb-0.5">{r.product_title}</p>
                              <p className="text-xs text-slate-500 font-medium">Rented by <span className="text-slate-700">{r.customer_name}</span></p>
                            </div>
                          </div>
                          
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-none border-slate-200">
                            <div className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                              <span className="text-slate-400 font-normal">to</span> 
                              {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLES[r.status]} sm:mt-1`}>
                              {r.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN (Pending & Actions) ── */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Pending Requests */}
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {pendingRentals.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                Pending Requests
              </h2>
            </div>
            
            {loading ? <div className="py-8 flex justify-center"><LoadingSpinner /></div> : pendingRentals.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-medium">All caught up!</p>
                <p className="text-xs mt-1">No pending rental requests.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRentals.slice(0, 4).map(r => (
                  <div key={r.id} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl transition hover:shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-slate-900">{r.product_title}</p>
                        <p className="text-xs font-medium text-slate-500 mt-1">Req. by <span className="text-slate-700">{r.customer_name}</span></p>
                      </div>
                      <span className="font-extrabold text-blue-600">₱{r.total_price?.toLocaleString()}</span>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-lg p-2.5 mb-4">
                      <p className="text-xs text-slate-600 font-medium text-center">
                        {new Date(r.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} <span className="text-slate-400 mx-1">→</span> {new Date(r.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleStatus(r.id, 'approved')}
                        disabled={!!actionLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-sm transition shadow-sm hover:shadow-blue-600/20 disabled:opacity-50"
                      >
                        {actionLoading === r.id + 'approved' ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleStatus(r.id, 'rejected')}
                        disabled={!!actionLoading}
                        className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold py-2 rounded-xl text-sm transition disabled:opacity-50"
                      >
                        {actionLoading === r.id + 'rejected' ? '...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
                {pendingRentals.length > 4 && (
                  <Link to="/supplier/rentals" className="block text-center text-sm font-semibold text-slate-500 hover:text-blue-600 mt-2">
                    View {pendingRentals.length - 4} more
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Action Links */}
          <div className="grid grid-cols-2 gap-4">
            <Link to="/supplier/products" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition group">
              <Package className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-slate-900 text-sm">Inventory</p>
              <p className="text-xs text-slate-500 mt-1">Manage listings</p>
            </Link>
            <Link to="/supplier/rentals" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-purple-300 hover:shadow-md transition group">
              <ClipboardList className="w-8 h-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-slate-900 text-sm">All Rentals</p>
              <p className="text-xs text-slate-500 mt-1">View history</p>
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
}

// Custom icon component for pending since lucide doesn't have it by default or it's named differently in older versions
function ClockIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}