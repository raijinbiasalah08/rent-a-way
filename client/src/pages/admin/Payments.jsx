import { useState, useEffect } from 'react';
import { getAdminPayments } from '../../api/admin';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const METHOD_ICONS = { gcash: '📱', maya: '💜', card: '💳', bank: '🏦' };

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAdminPayments()
      .then(res => setPayments(res.data?.data || []))
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter(p =>
    !search ||
    p.transaction_ref?.toLowerCase().includes(search.toLowerCase()) ||
    p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.method?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Manage Payments</h1>

      {/* Revenue Summary */}
      <div className="card mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Total Revenue Processed</p>
          <p className="text-3xl font-extrabold text-green-600">
            {loading ? '—' : `₱${totalRevenue.toLocaleString()}`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-navy-700">{payments.length}</p>
            <p className="text-xs text-gray-500">Transactions</p>
          </div>
          <div>
            <p className="text-xl font-bold text-navy-700">
              {payments.length > 0 ? `₱${(totalRevenue / payments.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
            </p>
            <p className="text-xs text-gray-500">Avg. Amount</p>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="mb-5">
          <input
            type="text"
            placeholder="Search by transaction ref or customer..."
            className="input max-w-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No payments found.</p>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 font-medium">Transaction Ref</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Rental Period</th>
                <th className="pb-3 font-medium">Method</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Paid At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-cream-50 transition">
                  <td className="py-3 font-mono text-xs text-navy-700 font-bold">{p.transaction_ref || '—'}</td>
                  <td className="py-3 text-gray-600">{p.customer_name}</td>
                  <td className="py-3 text-gray-500 text-xs">
                    {p.start_date && p.end_date
                      ? `${new Date(p.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${new Date(p.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : '—'}
                  </td>
                  <td className="py-3 capitalize">
                    <span className="flex items-center gap-1">
                      {METHOD_ICONS[p.method] || '💰'} {p.method}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-green-700">₱{p.amount?.toLocaleString()}</td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-xs">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 text-xs text-gray-400">{filtered.length} transaction(s)</div>
      </div>
    </div>
  );
}