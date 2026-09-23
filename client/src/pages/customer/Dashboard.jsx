import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRentals } from '../../api/rentals';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  LayoutDashboard,
  Store,
  Package,
  Compass,
  FolderOpen,
  Calendar,
  MessageSquare,
  Bookmark,
  Users,
  FileText,
  Settings,
  Search,
  Moon,
  Sun,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Plus,
  Eye,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  ChevronLeft
} from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dbRentals, setDbRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);

  useEffect(() => {
    getRentals()
      .then(res => setDbRentals(res.data?.data || []))
      .catch(err => console.warn('Could not load rentals:', err))
      .finally(() => setLoading(false));
  }, []);

  // Format database rentals
  const allRentals = useMemo(() => {
    return dbRentals.map(r => {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      return {
        ...r,
        duration_days: diffDays
      };
    });
  }, [dbRentals]);

  // Aggregate Metrics (pure real database values, 0 when empty)
  const metrics = useMemo(() => {
    const total = allRentals.length;
    const active = allRentals.filter(r => r.status === 'active' || r.status === 'approved').length;
    const completed = allRentals.filter(r => r.status === 'completed' || r.status === 'returned').length;
    const pending = allRentals.filter(r => r.status === 'pending').length;
    return { total, active, completed, pending };
  }, [allRentals]);

  // Filter agreements by status tab & search query
  const filteredRentals = useMemo(() => {
    return allRentals.filter(r => {
      const matchesSearch =
        !searchQuery ||
        r.product_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'All') return true;
      if (activeTab === 'Active') return r.status === 'active' || r.status === 'approved';
      if (activeTab === 'Pending') return r.status === 'pending';
      if (activeTab === 'Completed') return r.status === 'completed' || r.status === 'returned';
      if (activeTab === 'Overdue') return r.status === 'overdue';
      return true;
    });
  }, [allRentals, activeTab, searchQuery]);

  // 7-day activity data computed from real rentals (clean 0s when no rentals)
  const weeklyActivity = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({ day, checkouts: 0, returns: 0 }));
  }, [allRentals]);

  const userName = user?.name ? user.name.split(' ')[0] : 'Aaron';
  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AW';

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-gray-900 font-sans flex flex-col">
      {/* ══════════════════════════════════════════════════════════
          WORKSPACE CONTAINER (SIDEBAR + MAIN CONTENT)
      ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex max-w-[1720px] w-full mx-auto">

        {/* ── LEFT SIDEBAR (Pic 2 & 3 layout, No Upgrade To Pro) ── */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-20' : 'w-64'
          } hidden lg:flex flex-col bg-white border-r border-gray-200/80 transition-all duration-300 flex-shrink-0 relative select-none`}
        >
          {/* Logo brand */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="Rent-A-Way Logo"
                className="w-9 h-9 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
              />
              {!sidebarCollapsed && (
                <div>
                  <div className="text-gray-900 font-extrabold text-sm leading-none">Rent-A-Way</div>
                  <div className="text-amber-600 text-[8px] font-bold tracking-widest uppercase mt-0.5">
                    Find better ways to save
                  </div>
                </div>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 p-3.5 space-y-6 overflow-y-auto">
            {/* WORKSPACE GROUP */}
            <div>
              {!sidebarCollapsed && (
                <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase px-3 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Workspace
                </div>
              )}
              <nav className="space-y-1">
                <Link
                  to="/customer/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1e3a8a] text-white font-semibold text-xs shadow-xs"
                >
                  <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Dashboard</span>}
                </Link>


                <Link
                  to="/customer/rentals"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    {!sidebarCollapsed && <span>My Rentals</span>}
                  </div>
                  {!sidebarCollapsed && metrics.active > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800">
                      {metrics.active}
                    </span>
                  )}
                </Link>

                <Link
                  to="/browse"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <Compass className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  {!sidebarCollapsed && <span>Browse Equipment</span>}
                </Link>

                <Link
                  to="/map"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  {!sidebarCollapsed && <span>Roxas Map Finder</span>}
                </Link>
              </nav>
            </div>

            {/* MANAGE GROUP */}
            <div>
              {!sidebarCollapsed && (
                <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase px-3 mb-2">
                  Manage
                </div>
              )}
              <nav className="space-y-1">
                <Link
                  to="/customer/community"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <Users className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  {!sidebarCollapsed && <span>Community</span>}
                </Link>

                <Link
                  to="/customer/favorites"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <Bookmark className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  {!sidebarCollapsed && <span>Saved Gear</span>}
                </Link>

                <Link
                  to="/messages"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    {!sidebarCollapsed && <span>Messages</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  )}
                </Link>

                <Link
                  to="/customer/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <Settings className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  {!sidebarCollapsed && <span>Settings</span>}
                </Link>
              </nav>
            </div>
          </div>

          {/* User profile footer */}
          <div className="p-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <Link to="/customer/profile" className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition">
              <div className="w-8 h-8 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                {userInitials}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-800 truncate">{user?.name || 'Aaron Jasper'}</div>
                  <div className="text-[10px] text-gray-400 truncate capitalize">{user?.role || 'Renter'} · Roxas</div>
                </div>
              )}
            </Link>
          </div>
        </aside>

        {/* ── RIGHT MAIN DASHBOARD CONTENT ── */}
        <div className="flex-1 flex flex-col min-w-0">



          {/* Main Dashboard Scroll Area */}
          <main className="p-4 sm:p-7 space-y-7">

            {/* ══════════════════════════════════════════════════════
                HERO OVERVIEW BANNER (Dark Technical Navy matching Pic 1 theme & Pic 2 layout)
            ══════════════════════════════════════════════════════ */}
            <div className="relative bg-[#0f1729] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white overflow-hidden shadow-lg border border-blue-900/40">
              {/* Radial glow background & subtle grid */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Top row: Greeting & summary stats */}
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6">
                <div>
                  <div className="text-blue-300/80 text-[10px] font-mono tracking-widest uppercase mb-2 flex items-center gap-2">
                    <span>OVERVIEW</span>
                    <span className="w-6 h-px bg-blue-400/40"></span>
                    <span>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
                    Welcome back, {userName}
                  </h1>
                  <p className="text-gray-300 text-xs sm:text-sm max-w-xl leading-relaxed">
                    You have <span className="text-amber-400 font-bold">{metrics.active} active rental{metrics.active !== 1 ? 's' : ''}</span> and{' '}
                    <span className="text-blue-300 font-bold">{metrics.pending} booking{metrics.pending !== 1 ? 's' : ''}</span> awaiting supplier confirmation in Roxas.
                  </p>
                </div>

                {/* Right Stat Numbers & CTA */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center min-w-[100px]">
                    <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white leading-none mb-1">
                      {String(metrics.active).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
                      Active Rentals
                    </div>
                  </div>

                  <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center min-w-[100px]">
                    <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400 leading-none mb-1">
                      {String(metrics.pending).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
                      Returns Due
                    </div>
                  </div>

                  <Link
                    to="/browse"
                    className="inline-flex items-center gap-2 bg-white text-[#0f1729] font-bold text-xs sm:text-sm px-5 py-3 rounded-xl hover:bg-gray-100 transition shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 text-blue-600" /> New Rental
                  </Link>
                </div>
              </div>

              {/* Bottom live status ticker bar */}
              <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center gap-y-2 gap-x-6 text-[11px] text-gray-300">
                {metrics.active > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold text-white uppercase text-[9px] tracking-wider">LIVE</span>
                    <span className="text-gray-300">
                      {metrics.active} rental{metrics.active !== 1 ? 's' : ''} currently active in Roxas
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider">STATUS</span>
                    <span className="text-gray-300">No active rentals in progress</span>
                  </div>
                )}

                {metrics.pending > 0 ? (
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{metrics.pending} booking request{metrics.pending !== 1 ? 's' : ''} pending confirmation</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Explore available rentals across 20 Roxas Barangays</span>
                  </div>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                SECTION 01: KEY METRICS (Exact 4 Cards from Pic 2)
            ══════════════════════════════════════════════════════ */}
            <section className="space-y-3">
              <div className="flex items-baseline gap-2.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-xs">
                  01
                </span>
                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Key Metrics</h2>
                <span className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase ml-2 hidden sm:inline">
                  Your rolling 30-day performance snapshot
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric Card 1: TOTAL RENTALS */}
                <div className="relative bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs hover:border-[#1e3a8a]/40 transition group overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="text-3xl font-mono font-extrabold text-gray-900 mb-1">
                    {metrics.total}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                    Total Rentals
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">All bookings recorded</div>
                </div>

                {/* Metric Card 2: ACTIVE RENTALS */}
                <div className="relative bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs hover:border-[#1e3a8a]/40 transition group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="text-3xl font-mono font-extrabold text-gray-900 mb-1">
                    {metrics.active}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                    Active Rentals
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Currently in your possession</div>
                </div>

                {/* Metric Card 3: COMPLETED */}
                <div className="relative bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs hover:border-[#1e3a8a]/40 transition group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="text-3xl font-mono font-extrabold text-gray-900 mb-1">
                    {metrics.completed}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                    Completed
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Successfully returned items</div>
                </div>

                {/* Metric Card 4: PENDING APPROVAL */}
                <div className="relative bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs hover:border-[#1e3a8a]/40 transition group overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    {metrics.pending > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                        Action Needed
                      </span>
                    )}
                  </div>

                  <div className="text-3xl font-mono font-extrabold text-gray-900 mb-1">
                    {metrics.pending}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                    Pending Approval
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Awaiting supplier response</div>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                SECTION 02: ACTIVE & APPROVED RENTALS (Pic 3 Layout)
            ══════════════════════════════════════════════════════ */}
            <section className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-7 shadow-xs">
              {/* Header row with numbered badge, title, subtitle & tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-xs">
                      02
                    </span>
                    <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                      Active & Approved Rentals
                    </h2>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase">
                    {filteredRentals.length} AGREEMENTS IN VIEW
                  </div>
                </div>

                {/* Filter Tabs matching Pic 3 */}
                <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
                  {['All', 'Active', 'Pending', 'Completed', 'Overdue'].map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        activeTab === tab
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table view matching Pic 3 */}
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Rental</th>
                      <th className="py-3 px-3">Supplier</th>
                      <th className="py-3 px-3">Period</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <LoadingSpinner />
                        </td>
                      </tr>
                    ) : filteredRentals.length > 0 ? (
                      filteredRentals.map(rental => {
                        const status = (rental.status || 'active').toLowerCase();
                        return (
                          <tr key={rental.id} className="hover:bg-gray-50/70 transition group">
                            {/* RENTAL PRODUCT */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-[#1e3a8a] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                                  <Package className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-gray-900 text-sm truncate group-hover:text-[#1e3a8a] transition">
                                    {rental.product_title || 'Equipment Item'}
                                  </div>
                                  <div className="text-[11px] font-mono text-gray-400">
                                    {rental.id?.slice(0, 7).toUpperCase()} · {rental.product_category || 'General'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* SUPPLIER */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                  {rental.supplier_name
                                    ? rental.supplier_name.split(' ').map(n => n[0]).join('').slice(0, 2)
                                    : 'SU'}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800 truncate max-w-[130px]">
                                    {rental.supplier_name || 'Verified Supplier'}
                                  </div>
                                  <div className="text-[10px] text-gray-400 truncate">
                                    Brgy. {rental.supplier_barangay || 'San Aquilino'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* PERIOD */}
                            <td className="py-3.5 px-3 whitespace-nowrap text-gray-600 font-medium">
                              <div>
                                {new Date(rental.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} —{' '}
                                {new Date(rental.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                <span className="ml-1.5 text-gray-400 text-[11px]">
                                  ({rental.duration_days || 1}d)
                                </span>
                              </div>
                            </td>

                            {/* AMOUNT */}
                            <td className="py-3.5 px-3 font-mono font-extrabold text-gray-900 text-sm whitespace-nowrap">
                              ₱{rental.total_price?.toLocaleString()}
                            </td>

                            {/* STATUS BADGE */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {status === 'active' && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                                  Active
                                </span>
                              )}
                              {status === 'pending' && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                  Pending
                                </span>
                              )}
                              {status === 'completed' && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                                  Completed
                                </span>
                              )}
                              {status === 'overdue' && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#0f1729] text-white">
                                  Overdue
                                </span>
                              )}
                              {!['active', 'pending', 'completed', 'overdue'].includes(status) && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 uppercase">
                                  {status}
                                </span>
                              )}
                            </td>

                            {/* ACTION BUTTON */}
                            <td className="py-3.5 px-3 text-right">
                              <Link
                                to="/customer/rentals"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 inline-flex transition"
                                title="View details"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          No agreements matching the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                SECTION 03: RENTAL ACTIVITY (Pic 3 Layout)
            ══════════════════════════════════════════════════════ */}
            <section className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-xs">
                      03
                    </span>
                    <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Rental Activity</h2>
                  </div>
                  <div className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase">
                    Checkouts vs. returns across the last 7 days · {metrics.total} total bookings
                  </div>
                </div>

                {/* Legend matching Pic 3 */}
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]"></span>
                    <span className="text-gray-600 font-mono text-[11px] tracking-wider uppercase">Checkouts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="text-gray-600 font-mono text-[11px] tracking-wider uppercase">Returns</span>
                  </div>
                </div>
              </div>

              {/* Activity Chart Bars */}
              {metrics.total > 0 ? (
                <div className="grid grid-cols-7 gap-2 sm:gap-6 pt-6 pb-2 border-t border-gray-100">
                  {weeklyActivity.map(item => (
                    <div key={item.day} className="flex flex-col items-center gap-2 group">
                      <div className="h-36 w-full flex items-end justify-center gap-1.5 px-1 pb-1">
                        {/* Checkouts Bar (Navy) */}
                        <div
                          style={{ height: `${Math.max(4, item.checkouts * 2.5)}px` }}
                          className="w-full max-w-[14px] bg-[#1e3a8a] rounded-t-sm group-hover:bg-[#1d4ed8] transition"
                          title={`Checkouts: ${item.checkouts}`}
                        ></div>
                        {/* Returns Bar (Amber) */}
                        <div
                          style={{ height: `${Math.max(4, item.returns * 2.5)}px` }}
                          className="w-full max-w-[14px] bg-amber-400 rounded-t-sm group-hover:bg-amber-300 transition"
                          title={`Returns: ${item.returns}`}
                        ></div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">{item.day}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pt-8 pb-6 border-t border-gray-100 text-center flex flex-col items-center justify-center">
                  <Calendar className="w-8 h-8 text-gray-300 mb-2" />
                  <div className="text-xs font-bold text-gray-700">No rental activity this week</div>
                  <p className="text-[11px] text-gray-400 max-w-xs mt-0.5">
                    Your scheduled item pick-ups and return dates will automatically graph here.
                  </p>
                </div>
              )}
            </section>

          </main>
        </div>
      </div>
    </div>
  );
}