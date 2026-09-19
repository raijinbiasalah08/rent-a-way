import { useState, useEffect } from 'react';
import { getReports, getStats } from '../../api/admin';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PIE_COLORS = ['#1a237e', '#f4c430', '#3b82f6', '#10b981', '#f97316', '#8b5cf6'];

export default function Reports() {
  const [reports, setReports] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getReports(), getStats()])
      .then(([reportsRes, statsRes]) => {
        setReports(reportsRes.data?.data || {});
        setStats(statsRes.data?.data || {});
      })
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;

  const topProducts = reports?.topProducts || [];
  const rentalsByCategory = reports?.rentalsByCategory || [];

  const SUMMARY_CARDS = [
    { label: 'Total Revenue', value: `₱${((stats?.total_revenue || 0)).toLocaleString()}`, color: 'text-green-600', emoji: '💰' },
    { label: 'Total Rentals', value: stats?.total_rentals ?? 0, color: 'text-navy-700', emoji: '📋' },
    { label: 'Active Rentals', value: stats?.active_rentals ?? 0, color: 'text-blue-600', emoji: '✅' },
    { label: 'Pending', value: stats?.pending_rentals ?? 0, color: 'text-yellow-600', emoji: '⏳' },
    { label: 'Total Products', value: stats?.total_products ?? 0, color: 'text-purple-600', emoji: '📦' },
    { label: 'Total Users', value: stats?.total_users ?? 0, color: 'text-gray-700', emoji: '👥' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Reports & Analytics</h1>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {SUMMARY_CARDS.map(c => (
          <div key={c.label} className="card text-center p-4 hover:shadow-md transition">
            <div className="text-2xl mb-1">{c.emoji}</div>
            <div className={`text-xl font-extrabold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Products by Rentals */}
        <div className="card">
          <h2 className="font-bold text-lg text-navy-700 mb-5">Top Products by Rentals</h2>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">No rental data yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={130}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={v => v?.length > 18 ? v.slice(0, 18) + '…' : v}
                  />
                  <Tooltip formatter={(v) => [v, 'Rentals']} />
                  <Bar dataKey="rental_count" fill="#1a237e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Rentals by Category */}
        <div className="card">
          <h2 className="font-bold text-lg text-navy-700 mb-5">Rentals by Category</h2>
          {rentalsByCategory.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">No category data yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rentalsByCategory}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {rentalsByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Revenue Chart placeholder — populate with real data when revenueByMonth is implemented */}
      {reports?.revenueByMonth?.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-lg text-navy-700 mb-5">Monthly Revenue</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reports.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={v => `₱${v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [`₱${v.toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#f4c430" strokeWidth={3} dot={{ fill: '#1a237e', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}