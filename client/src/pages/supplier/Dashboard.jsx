import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRentals, updateRentalStatus } from '../../api/rentals';
import { getProducts } from '../../api/products';
import { updateProfile } from '../../api/auth';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import LocationPicker from '../../components/LocationPicker';
import { isWithinRoxas, ROXAS_BARANGAYS, formatRoxasAddress } from '../../utils/roxasLocation';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
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
  Bell,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  MapPin,
  X,
  Loader2,
  CheckCheck,
  XCircle,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Clock3
} from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-blue-50 text-blue-800 border-blue-200',
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function SupplierDashboard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [dbRentals, setDbRentals] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Quick Location Management state for Roxas, Oriental Mindoro
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editBarangay, setEditBarangay] = useState(user?.barangay || 'San Aquilino');
  const [editStreet, setEditStreet] = useState('');
  const [editLandmark, setEditLandmark] = useState('');
  const [editLocation, setEditLocation] = useState(user?.address || 'Brgy. San Aquilino, Roxas, Oriental Mindoro');
  const [editCoords, setEditCoords] = useState(
    user?.latitude && user?.longitude && isWithinRoxas(user.latitude, user.longitude)
      ? [Number(user.latitude), Number(user.longitude)]
      : [12.5967, 121.4841]
  );
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    if (user?.barangay) setEditBarangay(user.barangay);
    if (user?.address) setEditLocation(user.address);
    if (user?.latitude && user?.longitude && isWithinRoxas(user.latitude, user.longitude)) {
      setEditCoords([Number(user.latitude), Number(user.longitude)]);
    }
  }, [user]);

  const fetchData = () => {
    Promise.all([getRentals(), api.get('/products/mine')])
      .then(([rentalsRes, productsRes]) => {
        setDbRentals(rentalsRes.data?.data || []);
        setDbProducts(productsRes.data?.data || []);
      })
      .catch((err) => {
        console.warn('Could not load supplier dashboard data:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Supplier action handler (Approve / Reject / Handover / Complete)
  const handleStatusUpdate = async (rentalId, status, notes = '') => {
    setActionLoading(rentalId + status);
    try {
      await updateRentalStatus(rentalId, status, notes);
      toast.success(
        status === 'approved'
          ? 'Rental approved! Renter has been notified.'
          : status === 'rejected'
            ? 'Rental request declined.'
            : status === 'active'
              ? 'Item handed over — Rental is now active!'
              : status === 'completed'
                ? 'Rental marked as completed & return verified!'
                : `Rental marked as ${status}`
      );
      fetchData();
      if (selectedRental && selectedRental.id === rentalId) {
        setSelectedRental(prev => ({ ...prev, status }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update rental status');
    } finally {
      setActionLoading(null);
    }
  };

  // Location saving handler
  const handleSaveLocation = async () => {
    if (!editBarangay) {
      return toast.error('Please select an official Barangay in Roxas');
    }
    if (!editLocation.trim()) {
      return toast.error('Address cannot be empty');
    }
    if (!editCoords || !editCoords[0] || !editCoords[1] || !isWithinRoxas(editCoords[0], editCoords[1])) {
      return toast.error('Only locations within Roxas, Oriental Mindoro are allowed.');
    }
    setSavingLocation(true);
    try {
      const res = await updateProfile({
        name: user?.name,
        phone: user?.phone,
        barangay: editBarangay,
        address: editLocation.trim(),
        latitude: editCoords[0],
        longitude: editCoords[1]
      });
      updateUser(res.data?.data || {
        barangay: editBarangay,
        address: editLocation.trim(),
        latitude: editCoords[0],
        longitude: editCoords[1]
      });
      toast.success('Pickup location updated! All listings synced to Roxas, Oriental Mindoro.');
      setShowLocationModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update pickup location');
    } finally {
      setSavingLocation(false);
    }
  };

  // Format database rentals
  const allSupplierRentals = useMemo(() => {
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
    const pending = allSupplierRentals.filter(r => r.status === 'pending').length;
    const active = allSupplierRentals.filter(r => r.status === 'active').length;
    const approved = allSupplierRentals.filter(r => r.status === 'approved').length;
    const completed = allSupplierRentals.filter(r => r.status === 'completed' || r.status === 'returned').length;
    const totalListings = dbProducts.length;

    const validRevenue = allSupplierRentals
      .filter(r => ['approved', 'active', 'completed', 'returned'].includes(r.status))
      .reduce((sum, r) => sum + (r.total_price || 0), 0);

    const revenueK = (validRevenue / 1000).toFixed(1);

    return {
      pending,
      active,
      approved,
      completed,
      totalListings,
      validRevenue,
      revenueK,
      totalRequests: allSupplierRentals.length
    };
  }, [allSupplierRentals, dbProducts]);

  // Filter rentals by tab & search query
  const filteredRentals = useMemo(() => {
    return allSupplierRentals.filter(r => {
      const matchesSearch =
        !searchQuery ||
        r.product_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'All') return true;
      if (activeTab === 'Pending') return r.status === 'pending';
      if (activeTab === 'Active') return r.status === 'active';
      if (activeTab === 'Approved') return r.status === 'approved';
      if (activeTab === 'Completed') return r.status === 'completed' || r.status === 'returned';
      if (activeTab === 'Declined') return r.status === 'rejected' || r.status === 'cancelled';
      return true;
    });
  }, [allSupplierRentals, activeTab, searchQuery]);

  // Earnings by product for Section 03 Chart (empty array if no revenue)
  const earningsData = useMemo(() => {
    const map = {};
    allSupplierRentals
      .filter(r => ['approved', 'active', 'completed', 'returned'].includes(r.status))
      .forEach(r => {
        const title = r.product_title || 'Equipment Item';
        if (!map[title]) map[title] = { title, earnings: 0, count: 0 };
        map[title].earnings += r.total_price || 0;
        map[title].count += 1;
      });
    return Object.values(map).sort((a, b) => b.earnings - a.earnings).slice(0, 5);
  }, [allSupplierRentals]);

  const userName = user?.name ? user.name.split(' ')[0] : 'Supplier';
  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SP';

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-gray-900 font-sans flex flex-col">
      {/* ══════════════════════════════════════════════════════════
          WORKSPACE CONTAINER (SIDEBAR + MAIN CONTENT)
      ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex max-w-[1720px] w-full mx-auto">

        {/* ── LEFT SIDEBAR (Matching Pic 2 & 3 layout, No Upgrade To Pro) ── */}
        <aside
          className={`${sidebarCollapsed ? 'w-20' : 'w-64'
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
                    Supplier Workspace
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
                {/* Active Dashboard Link */}
                <Link
                  to="/supplier/dashboard"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#0f1729] text-white font-semibold text-xs shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    {!sidebarCollapsed && <span>Dashboard</span>}
                  </div>
                  {!sidebarCollapsed && metrics.pending > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono text-[9px] font-bold">
                      {metrics.pending}
                    </span>
                  )}
                </Link>


                {/* My Equipment Inventory */}
                <Link
                  to="/supplier/products"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    {!sidebarCollapsed && <span>Equipment Inventory</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                      {metrics.totalListings}
                    </span>
                  )}
                </Link>

                {/* Rental Requests */}
                <Link
                  to="/supplier/rentals"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    {!sidebarCollapsed && <span>Rental Requests</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                      {metrics.pending} new
                    </span>
                  )}
                </Link>

                {/* Add New Listing */}
                <Link
                  to="/supplier/products/new"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 font-semibold text-xs transition"
                >
                  <Plus className="w-4 h-4 flex-shrink-0 text-blue-600" />
                  {!sidebarCollapsed && <span>Add Equipment</span>}
                </Link>

                {/* Roxas Map Finder */}
                <Link
                  to="/map"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <Compass className="w-4 h-4 flex-shrink-0 text-gray-400" />
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

                {/* Business Pickup Hub */}
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    {!sidebarCollapsed && <span>Pickup Location</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </button>

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
                  to="/supplier/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium text-xs transition"
                >
                  <Settings className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  {!sidebarCollapsed && <span>Settings &amp; Profile</span>}
                </Link>
              </nav>
            </div>
          </div>

          {/* User profile footer */}
          <div className="p-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <Link to="/supplier/profile" className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition">
              <div className="w-8 h-8 rounded-full bg-[#0f1729] text-amber-400 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                {userInitials}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-800 truncate">{user?.name || 'Equipment Supplier'}</div>
                  <div className="text-[10px] text-gray-400 truncate">Supplier · Brgy. {user?.barangay || 'San Aquilino'}</div>
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
              {/* Radial glow background & subtle lighting */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Top row: Greeting & supplier summary stats */}
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
                    You have <span className="text-amber-400 font-bold">{metrics.pending} pending requests</span> awaiting your confirmation and{' '}
                    <span className="text-emerald-400 font-bold">{metrics.active} active rentals</span> in use across Roxas.
                  </p>
                </div>

                {/* Right Stat Numbers & CTA */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center min-w-[100px]">
                    <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400 leading-none mb-1">
                      {String(metrics.pending).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
                      Pending Requests
                    </div>
                  </div>

                  <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center min-w-[100px]">
                    <div className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400 leading-none mb-1">
                      {String(metrics.active).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
                      Active Rentals
                    </div>
                  </div>

                  <Link
                    to="/supplier/products/new"
                    className="inline-flex items-center gap-2 bg-white text-[#0f1729] font-bold text-xs sm:text-sm px-5 py-3 rounded-xl hover:bg-gray-100 transition shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 text-blue-600" /> Add Product
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
                    <span>{metrics.pending} pending request{metrics.pending !== 1 ? 's' : ''} awaiting review</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>All rental requests handled</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-blue-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Verified Supplier in Roxas, Oriental Mindoro</span>
                </div>
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
                {/* Metric Card 1: TOTAL REVENUE */}
                <div className="relative bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs hover:border-[#1e3a8a]/40 transition group overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="text-3xl font-mono font-extrabold text-gray-900 mb-1">
                    ₱{metrics.validRevenue > 0 ? (metrics.validRevenue >= 1000 ? `${metrics.revenueK}k` : metrics.validRevenue.toLocaleString()) : '0'}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                    Total Revenue
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">from active &amp; completed rentals</div>
                </div>

                {/* Metric Card 2: ACTIVE RENTALS (IN FIELD) */}
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
                  <div className="text-[11px] text-gray-400 mt-0.5">items currently with renters</div>
                </div>

                {/* Metric Card 3: EQUIPMENT LISTINGS (INVENTORY) */}
                <div className="relative bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs hover:border-[#1e3a8a]/40 transition group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="text-3xl font-mono font-extrabold text-gray-900 mb-1">
                    {metrics.totalListings}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                    Equipment Listed
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">live in Roxas catalog</div>
                </div>

                {/* Metric Card 4: PENDING APPROVALS */}
                <div className="relative bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs hover:border-[#1e3a8a]/40 transition group">
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
                    Pending Requests
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">review &amp; confirm bookings</div>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                SECTION 02: ACTIVE & APPROVED RENTALS (Pic 2 Layout with Supplier Actions)
            ══════════════════════════════════════════════════════ */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-xs">
                      02
                    </span>
                    <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                      Rental Requests &amp; Active Bookings
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 ml-7">
                    {filteredRentals.length} bookings &amp; customer requests in view
                  </p>
                </div>

                {/* Filter Tabs matching Pic 2 */}
                <div className="inline-flex p-1 bg-white border border-gray-200/90 rounded-xl text-xs font-semibold text-gray-600 shadow-2xs self-start sm:self-auto overflow-x-auto max-w-full">
                  {['All', 'Pending', 'Active', 'Approved', 'Completed', 'Declined'].map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${activeTab === tab
                          ? 'bg-[#0f1729] text-white shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden">
                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center">
                    <LoadingSpinner />
                    <p className="text-xs text-gray-400 mt-3">Loading supplier bookings…</p>
                  </div>
                ) : filteredRentals.length === 0 ? (
                  <div className="py-16 text-center px-4">
                    <FolderOpen className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <h3 className="text-sm font-bold text-gray-800">No requests found</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                      There are no rental requests matching your selected tab or search query.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          <th className="py-3 px-5">Equipment &amp; Renter</th>
                          <th className="py-3 px-4">Rental Duration</th>
                          <th className="py-3 px-4">Dates</th>
                          <th className="py-3 px-4">Earnings</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-5 text-right">Supplier Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {filteredRentals.map(rental => (
                          <tr
                            key={rental.id}
                            className="hover:bg-amber-50/30 transition group"
                          >
                            {/* Equipment & Renter */}
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-400 shadow-2xs">
                                  {rental.primary_image ? (
                                    <img
                                      src={rental.primary_image.startsWith('http') ? rental.primary_image : `http://localhost:5000${rental.primary_image}`}
                                      alt={rental.product_title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-gray-900 truncate">
                                    {rental.product_title}
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    Renter: <strong className="text-gray-700">{rental.customer_name || 'Customer'}</strong> · {rental.barangay || 'San Aquilino'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Duration */}
                            <td className="py-4 px-4 font-mono font-medium text-gray-700">
                              <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                                {rental.duration_days || 1} day{rental.duration_days > 1 ? 's' : ''}
                              </span>
                            </td>

                            {/* Dates */}
                            <td className="py-4 px-4 text-gray-600">
                              <div className="font-medium text-gray-800">
                                {rental.start_date ? new Date(rental.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                <span className="text-gray-400 mx-1">→</span>
                                {rental.end_date ? new Date(rental.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </div>
                            </td>

                            {/* Total Earnings */}
                            <td className="py-4 px-4 font-mono font-bold text-gray-900 text-sm">
                              ₱{(rental.total_price || 0).toLocaleString()}
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${STATUS_STYLES[rental.status] || STATUS_STYLES.pending
                                  }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {rental.status}
                              </span>
                            </td>

                            {/* Supplier Quick Actions */}
                            <td className="py-4 px-5 text-right">
                              <div className="inline-flex items-center justify-end gap-2">
                                {rental.status === 'pending' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusUpdate(rental.id, 'approved')}
                                      disabled={actionLoading === rental.id + 'approved'}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer disabled:opacity-60"
                                      title="Approve rental request"
                                    >
                                      {actionLoading === rental.id + 'approved' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                      <span>Approve</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleStatusUpdate(rental.id, 'rejected')}
                                      disabled={actionLoading === rental.id + 'rejected'}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer disabled:opacity-60"
                                      title="Decline request"
                                    >
                                      {actionLoading === rental.id + 'rejected' ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <X className="w-3.5 h-3.5" />
                                      )}
                                      <span>Decline</span>
                                    </button>
                                  </>
                                ) : rental.status === 'approved' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(rental.id, 'active')}
                                    disabled={actionLoading === rental.id + 'active'}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                                    title="Mark item as picked up by renter"
                                  >
                                    {actionLoading === rental.id + 'active' ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Package className="w-3.5 h-3.5" />
                                    )}
                                    <span>Hand Over</span>
                                  </button>
                                ) : rental.status === 'active' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(rental.id, 'completed')}
                                    disabled={actionLoading === rental.id + 'completed'}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                                    title="Verify return and complete rental"
                                  >
                                    {actionLoading === rental.id + 'completed' ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCheck className="w-3.5 h-3.5" />
                                    )}
                                    <span>Verify Return</span>
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => setSelectedRental(rental)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                                  title="View Full Rental Agreement"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════
                SECTION 03: ANALYTICS & ROXAS PICKUP LOCATION HUB
            ══════════════════════════════════════════════════════ */}
            <section className="space-y-4">
              <div className="flex items-baseline gap-2.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-xs">
                  03
                </span>
                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                  Operations &amp; Performance
                </h2>
                <span className="text-[10px] font-mono font-bold text-gray-400 tracking-widest uppercase ml-2 hidden sm:inline">
                  Top performing equipment and Roxas pickup location
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ── Left: Top Earning Equipment Chart ── */}
                <div className="lg:col-span-7 bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Top Earning Equipment in Roxas
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Earnings generated across completed and active rental agreements
                      </p>
                    </div>
                    <Link
                      to="/supplier/products"
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      View Catalog →
                    </Link>
                  </div>

                  {earningsData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={earningsData} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={v => `₱${v}`}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                          />
                          <YAxis
                            type="category"
                            dataKey="title"
                            width={140}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                            tickFormatter={v => v?.length > 18 ? v.slice(0, 18) + '…' : v}
                          />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)' }}
                            formatter={(v) => [`₱${v.toLocaleString()}`, 'Total Revenue']}
                          />
                          <Bar dataKey="earnings" fill="#1e3a8a" radius={[0, 6, 6, 0]} barSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <Package className="w-8 h-8 text-gray-300 mb-2" />
                      <div className="text-xs font-bold text-gray-700">No earnings recorded yet</div>
                      <p className="text-[11px] text-gray-400 max-w-xs mt-1">
                        Completed and active bookings will display your highest earning equipment here.
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Right: Business & Pickup Location Card ── */}
                <div className="lg:col-span-5 bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">Roxas Pickup Hub</h3>
                          <p className="text-[11px] text-gray-500">Equipment pickup spot for local renters</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLocationModal(true)}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        Update Location
                      </button>
                    </div>

                    <div className="bg-[#f5f0e8]/80 border border-amber-200/70 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold bg-[#0f1729] text-white px-2.5 py-0.5 rounded-md">
                          Brgy. {user?.barangay || 'San Aquilino'}
                        </span>
                        <span className="text-xs font-medium text-gray-600">Roxas, Oriental Mindoro</span>
                      </div>

                      <div className="flex items-start gap-2 pt-1">
                        <MapPin className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">
                          {user?.address || 'Brgy. San Aquilino, Roxas, Oriental Mindoro'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-amber-200/60">
                        <span>
                          GPS: <strong className="font-mono text-gray-800">
                            {user?.latitude && user?.longitude ? `${Number(user.latitude).toFixed(4)}, ${Number(user.longitude).toFixed(4)}` : '12.5967, 121.4841'}
                          </strong>
                        </span>
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Auto-syncs listings
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                    <Link
                      to="/supplier/products"
                      className="p-3 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-200/80 hover:border-blue-200 text-center transition group"
                    >
                      <Package className="w-5 h-5 text-gray-400 group-hover:text-blue-600 mx-auto mb-1" />
                      <div className="text-xs font-bold text-gray-800">Manage Listings</div>
                      <div className="text-[10px] text-gray-400">{metrics.totalListings} items active</div>
                    </Link>

                    <Link
                      to="/supplier/rentals"
                      className="p-3 rounded-xl bg-gray-50 hover:bg-amber-50 border border-gray-200/80 hover:border-amber-200 text-center transition group"
                    >
                      <Clock className="w-5 h-5 text-gray-400 group-hover:text-amber-600 mx-auto mb-1" />
                      <div className="text-xs font-bold text-gray-800">Rental Requests</div>
                      <div className="text-[10px] text-gray-400">{metrics.pending} awaiting reply</div>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          RENTAL DETAILS MODAL
      ══════════════════════════════════════════════════════════ */}
      {selectedRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <div className="text-[10px] font-bold text-amber-700 tracking-wider uppercase mb-1">
                  Agreement Details · {selectedRental.id}
                </div>
                <h3 className="text-lg font-extrabold text-gray-900">
                  {selectedRental.product_title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRental(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200/70">
                <span className="text-xs font-medium text-gray-600">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${STATUS_STYLES[selectedRental.status] || STATUS_STYLES.pending
                    }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {selectedRental.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Renter</span>
                  <div className="font-bold text-gray-900 mt-1">{selectedRental.customer_name || 'Customer'}</div>
                  <div className="text-gray-500 text-[11px] mt-0.5">{selectedRental.barangay || 'Roxas'}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Duration</span>
                  <div className="font-bold text-gray-900 mt-1">{selectedRental.duration_days || 1} day(s)</div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    {selectedRental.start_date} → {selectedRental.end_date}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Contact Mobile:</span>
                  <span className="font-bold text-gray-800">{selectedRental.customer_phone || '0917 123 4567'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contact Email:</span>
                  <span className="font-bold text-gray-800">{selectedRental.customer_email || 'renter@example.com'}</span>
                </div>
                {selectedRental.notes && (
                  <div className="pt-2 mt-2 border-t border-gray-200">
                    <span className="text-gray-500 block text-[11px]">Renter Notes:</span>
                    <p className="text-gray-800 font-medium mt-0.5 italic text-xs">"{selectedRental.notes}"</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-blue-900 uppercase">Total Rental Price</div>
                  <div className="text-xl font-extrabold text-blue-950 font-mono">
                    ₱{(selectedRental.total_price || 0).toLocaleString()}
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                  Payment on Pickup / GCash
                </span>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
              {selectedRental.status === 'pending' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedRental.id, 'rejected')}
                    disabled={actionLoading === selectedRental.id + 'rejected'}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
                  >
                    Decline Request
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(selectedRental.id, 'approved')}
                    disabled={actionLoading === selectedRental.id + 'approved'}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Approve Request
                  </button>
                </>
              ) : selectedRental.status === 'approved' ? (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedRental.id, 'active')}
                  disabled={actionLoading === selectedRental.id + 'active'}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer"
                >
                  Mark as Handed Over
                </button>
              ) : selectedRental.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedRental.id, 'completed')}
                  disabled={actionLoading === selectedRental.id + 'completed'}
                  className="px-5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition shadow-xs cursor-pointer"
                >
                  Verify Return &amp; Complete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedRental(null)}
                  className="px-5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          LOCATION EDIT MODAL
      ══════════════════════════════════════════════════════════ */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Update Roxas Pickup &amp; Business Hub</h3>
                <p className="text-xs text-gray-500">
                  Restricted to Roxas, Oriental Mindoro. Updating automatically syncs your equipment listings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <LocationPicker
                barangay={editBarangay}
                street={editStreet}
                landmark={editLandmark}
                location={editLocation}
                latitude={editCoords ? editCoords[0] : null}
                longitude={editCoords ? editCoords[1] : null}
                required={true}
                onChange={({ barangay: newB, street: newS, landmark: newL, location: newLoc, latitude: newLat, longitude: newLng }) => {
                  setEditBarangay(newB);
                  setEditStreet(newS);
                  setEditLandmark(newL);
                  setEditLocation(newLoc);
                  if (newLat && newLng) {
                    setEditCoords([newLat, newLng]);
                  }
                }}
              />
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                disabled={savingLocation}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={savingLocation}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#0f1729] hover:bg-gray-800 disabled:opacity-50 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {savingLocation ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : null}
                <span>{savingLocation ? 'Saving & Syncing…' : 'Save & Sync All Listings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}