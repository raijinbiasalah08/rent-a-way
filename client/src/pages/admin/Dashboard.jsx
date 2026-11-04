import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock3,
  CreditCard,
  Flag,
  LayoutDashboard,
  MessageSquare,
  Package,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAdminRentals, getStats } from '../../api/admin';
import LoadingSpinner from '../../components/LoadingSpinner';

const TABS = ['All', 'Pending', 'Active', 'Approved', 'Completed', 'Declined'];

const STATUS_STYLES = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  approved: 'border-blue-200 bg-blue-50 text-blue-800',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  completed: 'border-gray-200 bg-gray-100 text-gray-700',
  returned: 'border-violet-200 bg-violet-50 text-violet-800',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
};

function formatMoney(value) {
  const amount = Number(value) || 0;
  return amount >= 1000
    ? `₱${(amount / 1000).toFixed(1)}k`
    : `₱${amount.toLocaleString('en-PH')}`;
}

function formatDate(value, options = { month: 'short', day: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-PH', options);
}

function rentalDuration(rental) {
  if (!rental.start_date || !rental.end_date) return '—';
  const start = new Date(rental.start_date);
  const end = new Date(rental.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';
  const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  return `${days} day${days === 1 ? '' : 's'}`;
}

function isInTab(status, tab) {
  if (tab === 'All') return true;
  if (tab === 'Declined') return ['rejected', 'cancelled', 'declined'].includes(status);
  return status === tab.toLowerCase();
}

function SidebarLink({ to, label, icon: Icon, active = false, collapsed, badge }) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition ${active
        ? 'bg-[#0f1729] font-semibold text-white shadow-sm'
        : 'font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-amber-400' : 'text-gray-400'}`} />
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
      {!collapsed && badge !== undefined && (
        <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${active
          ? 'bg-white/10 text-white'
          : 'bg-blue-50 text-blue-700'
          }`}>
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([getStats(), getAdminRentals()]).then(([statsResult, rentalsResult]) => {
      if (!isMounted) return;

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data?.data || {});
      } else {
        console.warn('Could not load admin dashboard statistics:', statsResult.reason);
        setLoadError(true);
      }

      if (rentalsResult.status === 'fulfilled') {
        setRentals(rentalsResult.value.data?.data || []);
      } else {
        console.warn('Could not load admin dashboard rentals:', rentalsResult.reason);
        setLoadError(true);
      }
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  const filteredRentals = useMemo(
    () => rentals.filter(rental => isInTab(rental.status, activeTab)),
    [rentals, activeTab]
  );

  const totals = {
    users: Number(stats.totalUsers) || 0,
    products: Number(stats.totalProducts) || 0,
    active: Number(stats.activeRentals) || 0,
    pending: Number(stats.pendingRentals) || 0,
    complaints: Number(stats.openComplaints) || 0,
    revenue: Number(stats.totalRevenue) || 0,
  };

  const userName = user?.name?.trim().split(/\s+/)[0] || 'Admin';
  const initials = user?.name
    ? user.name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  const metrics = [
    {
      label: 'Platform Revenue',
      value: formatMoney(totals.revenue),
      note: 'from completed payments',
      icon: TrendingUp,
      iconClass: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Active Rentals',
      value: totals.active,
      note: 'items currently with renters',
      icon: CheckCircle2,
      iconClass: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Equipment Listed',
      value: totals.products,
      note: 'active listings on Rent-A-Way',
      icon: Package,
      iconClass: 'bg-blue-50 text-blue-800',
    },
    {
      label: 'Pending Requests',
      value: totals.pending,
      note: 'rental bookings awaiting review',
      icon: Clock3,
      iconClass: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f0e8] font-sans text-gray-900">
      <div className="mx-auto flex w-full max-w-[1720px] flex-1">
        <aside className={`${sidebarCollapsed ? 'w-[76px]' : 'w-64'} relative hidden shrink-0 flex-col border-r border-gray-200/80 bg-white transition-all duration-300 lg:flex`}>
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <Link to="/" className="group flex min-w-0 items-center gap-3">
              <img src="/logo.png" alt="Rent-A-Way" className="h-9 w-9 shrink-0 object-contain transition-transform group-hover:scale-105" />
              {!sidebarCollapsed && (
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold leading-none text-gray-900">Rent-A-Way</span>
                  <span className="mt-1 block text-[8px] font-bold uppercase tracking-widest text-amber-600">Admin Workspace</span>
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(value => !value)}
              className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-3.5">
            <section>
              {!sidebarCollapsed && (
                <div className="mb-2 flex items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Workspace
                </div>
              )}
              <nav aria-label="Admin workspace" className="space-y-1">
                <SidebarLink to="/admin/dashboard" label="Dashboard" icon={LayoutDashboard} active collapsed={sidebarCollapsed} />
                <SidebarLink to="/admin/users" label="Users" icon={Users} collapsed={sidebarCollapsed} badge={totals.users} />
                <SidebarLink to="/admin/products" label="Equipment Inventory" icon={Package} collapsed={sidebarCollapsed} badge={totals.products} />
                <SidebarLink to="/admin/rentals" label="Rental Requests" icon={ClipboardList} collapsed={sidebarCollapsed} badge={totals.pending ? `${totals.pending} new` : '0 new'} />
                <SidebarLink to="/admin/payments" label="Payments" icon={CreditCard} collapsed={sidebarCollapsed} />
              </nav>
            </section>

            <section>
              {!sidebarCollapsed && <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Manage</div>}
              <nav aria-label="Platform management" className="space-y-1">
                <SidebarLink to="/admin/complaints" label="Complaints" icon={Flag} collapsed={sidebarCollapsed} badge={totals.complaints || undefined} />
                <SidebarLink to="/admin/reports" label="Reports & Analytics" icon={BarChart3} collapsed={sidebarCollapsed} />
                <SidebarLink to="/messages" label="Messages" icon={MessageSquare} collapsed={sidebarCollapsed} />
              </nav>
            </section>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 p-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f1729] text-xs font-bold text-amber-400">{initials}</div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-gray-800">{user?.name || 'Administrator'}</div>
                  <div className="truncate text-[10px] text-gray-400">Administrator</div>
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <nav aria-label="Admin quick navigation" className="flex gap-2 overflow-x-auto border-b border-gray-200 bg-white p-3 lg:hidden">
            {[
              ['/admin/dashboard', 'Dashboard'],
              ['/admin/users', 'Users'],
              ['/admin/products', 'Inventory'],
              ['/admin/rentals', 'Rentals'],
              ['/admin/payments', 'Payments'],
              ['/admin/complaints', 'Complaints'],
            ].map(([to, label]) => (
              <Link key={to} to={to} className="shrink-0 rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-800">
                {label}
              </Link>
            ))}
          </nav>

          <main className="space-y-7 p-4 sm:p-7">
            <section className="relative overflow-hidden rounded-2xl border border-blue-900/40 bg-[#0f1729] p-6 text-white shadow-lg sm:rounded-3xl sm:p-8">
              <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

              <div className="relative z-10 flex flex-col justify-between gap-6 border-b border-white/10 pb-6 lg:flex-row lg:items-center">
                <div>
                  <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-blue-300/80">
                    <span>Overview</span><span className="h-px w-6 bg-blue-400/40" />
                    <span>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</span>
                  </div>
                  <h1 className="mb-2 text-2xl font-extrabold tracking-tight sm:text-4xl">Welcome back, {userName}</h1>
                  <p className="max-w-2xl text-xs leading-relaxed text-gray-300 sm:text-sm">
                    There {totals.pending === 1 ? 'is' : 'are'} <span className="font-bold text-amber-400">{totals.pending} pending rental request{totals.pending === 1 ? '' : 's'}</span> for review and{' '}
                    <span className="font-bold text-emerald-400">{totals.active} active rental{totals.active === 1 ? '' : 's'}</span> across the platform.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="min-w-[112px] rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center">
                    <div className="mb-1 font-mono text-2xl font-extrabold leading-none text-amber-400 sm:text-3xl">{String(totals.pending).padStart(2, '0')}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Pending Requests</div>
                  </div>
                  <div className="min-w-[112px] rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center">
                    <div className="mb-1 font-mono text-2xl font-extrabold leading-none text-emerald-400 sm:text-3xl">{String(totals.active).padStart(2, '0')}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Active Rentals</div>
                  </div>
                  <Link to="/admin/rentals" className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 py-3 text-xs font-bold text-[#0f1729] shadow-sm transition hover:bg-gray-100 sm:text-sm">
                    <ArrowUpRight className="h-4 w-4 text-blue-700" /> Review Rentals
                  </Link>
                </div>
              </div>

              <div className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-[11px] text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="font-bold text-[9px] uppercase tracking-wider text-gray-400">Status</span>
                  <span>Platform monitoring active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{totals.users.toLocaleString()} registered accounts</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-300">
                  {totals.complaints > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> : <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />}
                  <span>{totals.complaints > 0 ? `${totals.complaints} open complaints need attention` : 'No open complaints'}</span>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-baseline gap-2.5">
                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-800">01</span>
                <h2 className="text-lg font-extrabold tracking-tight text-gray-900">Key Metrics</h2>
                <span className="ml-2 hidden font-mono text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:inline">Live platform snapshot</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map(({ label, value, note, icon: Icon, iconClass }) => (
                  <article key={label} className="group rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm transition hover:border-blue-800/40">
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}><Icon className="h-5 w-5" /></div>
                    <div className="mb-1 font-mono text-3xl font-extrabold text-gray-900">{value}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
                    <div className="mt-0.5 text-[11px] text-gray-400">{note}</div>
                  </article>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-800">02</span>
                    <h2 className="text-lg font-extrabold tracking-tight text-gray-900">Rental Requests &amp; Active Bookings</h2>
                  </div>
                  <p className="ml-7 mt-0.5 text-xs text-gray-500">{filteredRentals.length} bookings and customer requests in view</p>
                </div>

                <div className="inline-flex max-w-full self-start overflow-x-auto rounded-xl border border-gray-200/90 bg-white p-1 text-xs font-semibold text-gray-600 shadow-sm sm:self-auto">
                  {TABS.map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      aria-pressed={activeTab === tab}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 transition ${activeTab === tab ? 'bg-[#0f1729] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
                {loadError && (
                  <div role="status" className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-900">
                    Some dashboard data could not be loaded. You can still open each admin section from the sidebar.
                  </div>
                )}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <LoadingSpinner />
                    <p className="mt-3 text-xs text-gray-400">Loading platform bookings…</p>
                  </div>
                ) : filteredRentals.length === 0 ? (
                  <div className="px-4 py-16 text-center">
                    <ClipboardList className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                    <h3 className="text-sm font-bold text-gray-800">{rentals.length ? 'No bookings in this status' : 'No rental requests yet'}</h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-gray-400">
                      {rentals.length ? 'Choose another status filter to see more platform bookings.' : 'New customer requests will appear here as renters make bookings.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          <th className="px-5 py-3">Equipment &amp; Renter</th>
                          <th className="px-4 py-3">Rental Duration</th>
                          <th className="px-4 py-3">Dates</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Admin Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {filteredRentals.map(rental => {
                          const status = String(rental.status || 'pending').toLowerCase();
                          const title = rental.product_title || rental.title || 'Equipment item';
                          return (
                            <tr key={rental.id} className="group transition hover:bg-amber-50/30">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3.5">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-blue-50 text-blue-800">
                                    <Package className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="max-w-[240px] truncate font-bold text-gray-900">{title}</div>
                                    <div className="mt-1 truncate text-[11px] text-gray-500">{rental.customer_name || 'Renter'} · Supplier: {rental.supplier_name || '—'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-gray-600">{rentalDuration(rental)}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-gray-600">{formatDate(rental.start_date)} – {formatDate(rental.end_date)}</td>
                              <td className="px-4 py-4 whitespace-nowrap font-bold text-gray-900">{formatMoney(rental.total_price)}</td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${STATUS_STYLES[status] || 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <Link to="/admin/rentals" className="inline-flex items-center gap-1 font-semibold text-blue-800 hover:text-blue-950 hover:underline">
                                  Review <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Link to="/admin/users" className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50/50">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-700" /> Manage {totals.users.toLocaleString()} accounts</span>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </Link>
                <Link to="/admin/complaints" className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 transition hover:border-amber-200 hover:bg-amber-50/50">
                  <span className="flex items-center gap-2"><Flag className="h-4 w-4 text-amber-700" /> Review {totals.complaints} open complaints</span>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </Link>
                <Link to="/admin/reports" className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50/50">
                  <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-700" /> Open platform reports</span>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
