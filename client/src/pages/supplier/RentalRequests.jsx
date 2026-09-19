import { useState, useEffect } from 'react';
import { getRentals, updateRentalStatus } from '../../api/rentals';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const TABS = ['All', 'Pending', 'Approved', 'Active', 'Completed', 'Rejected'];

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-blue-100 text-blue-700',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
  rejected:  'bg-red-100 text-red-600',
};

export default function RentalRequests() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchRentals = () => {
    setLoading(true);
    getRentals()
      .then(res => setRentals(res.data?.data || []))
      .catch(() => toast.error('Failed to load rental requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRentals(); }, []);

  const handleStatus = async (rentalId, status) => {
    setActionLoading(rentalId + status);
    try {
      await updateRentalStatus(rentalId, status);
      toast.success(`Rental ${status}`);
      fetchRentals();
    } catch {
      toast.error('Failed to update rental status');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = rentals.filter(r =>
    tab === 'All' || r.status === tab.toLowerCase()
  );

  const tabCounts = TABS.reduce((acc, t) => {
    acc[t] = t === 'All' ? rentals.length : rentals.filter(r => r.status === t.toLowerCase()).length;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Rental Requests</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-200 pb-0">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold border-b-2 transition
              ${tab === t ? 'border-navy-700 text-navy-700' : 'border-transparent text-gray-500 hover:text-navy-600'}`}
          >
            {t}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-navy-100 text-navy-700' : 'bg-gray-100 text-gray-500'}`}>
              {tabCounts[t]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-medium">No {tab === 'All' ? '' : tab.toLowerCase()} rental requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => (
            <div key={r.id} className="card hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Info */}
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-navy-700">{r.product_title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Customer: <span className="font-medium">{r.customer_name}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(r.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' — '}
                    {new Date(r.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {r.notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">"{r.notes}"</p>
                  )}
                </div>

                {/* Amount + Actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-xl font-extrabold text-navy-700">₱{r.total_price?.toLocaleString()}</span>

                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatus(r.id, 'approved')}
                        disabled={!!actionLoading}
                        className="btn-primary text-sm py-1.5 px-5 disabled:opacity-60"
                      >
                        {actionLoading === r.id + 'approved' ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleStatus(r.id, 'rejected')}
                        disabled={!!actionLoading}
                        className="bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold py-1.5 px-5 hover:bg-red-100 transition disabled:opacity-60"
                      >
                        {actionLoading === r.id + 'rejected' ? '...' : 'Reject'}
                      </button>
                    </div>
                  )}

                  {r.status === 'active' && (
                    <button
                      onClick={() => handleStatus(r.id, 'completed')}
                      disabled={!!actionLoading}
                      className="btn-outline text-sm py-1.5 px-5 disabled:opacity-60"
                    >
                      {actionLoading === r.id + 'completed' ? '...' : 'Mark Completed'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}