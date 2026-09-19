import { useState, useEffect } from 'react';
import { getAdminRentals } from '../../api/admin';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-blue-100 text-blue-700',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
  returned:  'bg-purple-100 text-purple-700',
};

export default function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    getAdminRentals()
      .then(res => setRentals(res.data?.data || []))
      .catch(() => toast.error('Failed to load rentals'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rentals.filter(r => {
    const matchSearch = !search ||
      r.product_title?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Manage Rentals</h1>

      <div className="card overflow-x-auto">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Search product, customer, supplier..."
            className="input flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input w-full sm:w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No rentals found.</p>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Supplier</th>
                <th className="pb-3 font-medium">Dates</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-cream-50 transition">
                  <td className="py-3 font-medium text-navy-700">{r.product_title || r.title || '—'}</td>
                  <td className="py-3 text-gray-600">{r.customer_name}</td>
                  <td className="py-3 text-gray-500">{r.supplier_name}</td>
                  <td className="py-3 text-gray-500 text-xs">
                    {new Date(r.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    {' — '}
                    {new Date(r.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3 font-semibold text-navy-700">₱{r.total_price?.toLocaleString()}</td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 text-xs text-gray-400">{filtered.length} rental(s)</div>
      </div>
    </div>
  );
}