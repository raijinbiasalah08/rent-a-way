import { useState, useEffect } from 'react';
import { getComplaints, updateComplaint } from '../../api/admin';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  open:        'bg-red-100 text-red-700',
  investigating: 'bg-yellow-100 text-yellow-700',
  resolved:    'bg-green-100 text-green-700',
  closed:      'bg-gray-100 text-gray-500',
};

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchComplaints = () => {
    setLoading(true);
    getComplaints()
      .then(res => setComplaints(res.data?.data || []))
      .catch(() => toast.error('Failed to load complaints'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchComplaints(); }, []);

  const handleUpdateStatus = async (id, status) => {
    setUpdating(true);
    try {
      await updateComplaint(id, { status });
      toast.success(`Complaint marked as ${status}`);
      setSelected(null);
      fetchComplaints();
    } catch {
      toast.error('Failed to update complaint');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = complaints.filter(c => !filter || c.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Manage Complaints</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {['open', 'investigating', 'resolved', 'closed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? '' : s)}
            className={`card text-center transition hover:shadow-md ${filter === s ? 'ring-2 ring-navy-400' : ''}`}
          >
            <div className="text-2xl font-bold text-navy-700">
              {complaints.filter(c => c.status === s).length}
            </div>
            <div className="text-xs text-gray-500 capitalize mt-1">{s}</div>
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No complaints found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 font-medium">Reporter</th>
                <th className="pb-3 font-medium">Subject</th>
                <th className="pb-3 font-medium">Details</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-cream-50 transition align-top">
                  <td className="py-3 font-medium text-navy-700 whitespace-nowrap">{c.reporter_name}</td>
                  <td className="py-3 font-semibold whitespace-nowrap">{c.subject}</td>
                  <td className="py-3 text-gray-500 text-xs max-w-xs truncate">{c.details}</td>
                  <td className="py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <button
                      onClick={() => setSelected(c)}
                      className="text-xs text-navy-600 font-semibold hover:underline"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-4 text-xs text-gray-400">{filtered.length} complaint(s)</div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="font-bold text-lg text-navy-700 mb-1">{selected.subject}</h2>
            <p className="text-xs text-gray-400 mb-4">
              Reported by <strong>{selected.reporter_name}</strong> on{' '}
              {new Date(selected.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 mb-5">
              {selected.details || 'No details provided.'}
            </div>
            <p className="text-sm font-medium text-gray-600 mb-3">Update Status:</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {['open', 'investigating', 'resolved', 'closed'].map(s => (
                <button
                  key={s}
                  disabled={updating || selected.status === s}
                  onClick={() => handleUpdateStatus(selected.id, s)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition capitalize
                    ${selected.status === s ? 'border-navy-400 bg-navy-50 text-navy-700' : 'border-gray-200 hover:border-navy-400 text-gray-600 hover:text-navy-700'}
                    disabled:opacity-50`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button onClick={() => setSelected(null)} className="btn-outline w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}