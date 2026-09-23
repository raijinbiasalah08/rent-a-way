import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRentals, updateRentalStatus } from '../../api/rentals';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ReceiptModal from '../../components/ReceiptModal';
import { CheckCircle2, XCircle, RotateCcw, PackageCheck, MessageCircle, AlertCircle, Clock, Receipt, Eye, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

const BASE_URL = 'http://localhost:5000';


const TABS = ['All', 'Pending', 'Approved', 'Active', 'Returned', 'Completed', 'Cancelled', 'Rejected'];

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  returned: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

// ── Rejection Modal ────────────────────────────────────────────────────────
function RejectModal({ rental, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  const quickReasons = [
    'Item currently undergoing maintenance',
    'Schedule conflict / Already reserved offline',
    'Unable to arrange handover on requested dates',
    'Customer did not provide required verification',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" /> Decline Rental Request
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            You are about to decline the request for <span className="font-semibold text-gray-900">{rental.product_title}</span> from <span className="font-semibold text-gray-900">{rental.customer_name}</span>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Select or enter a reason:</label>
            <div className="space-y-1.5 mb-3">
              {quickReasons.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition ${reason === r ? 'border-[#1e3a8a] bg-blue-50/50 text-[#1e3a8a] font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
              placeholder="Custom reason or message to customer..."
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={loading}
              type="button"
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition disabled:opacity-60"
            >
              {loading ? 'Declining...' : 'Confirm Decline'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Payment Proof Inspection Modal ──────────────────────────────────────────
function ProofModal({ rental, onClose, onApprove, loading }) {
  if (!rental) return null;
  const imageUrl = rental.payment_receipt?.startsWith('http')
    ? rental.payment_receipt
    : `${BASE_URL}${rental.payment_receipt}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#1e3a8a]" />
            <h2 className="font-bold text-base text-gray-900">Payment Proof Inspection</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 font-bold p-1">✕</button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">Payment Method</span>
              <span className="font-bold text-gray-900 uppercase">{rental.payment_method || 'GCash'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">Reference No.</span>
              <span className="font-bold text-[#1e3a8a] truncate block">{rental.payment_ref || rental.payment_intent_id || 'N/A'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">Sender Name</span>
              <span className="font-semibold text-gray-900">{rental.payment_sender_name || rental.customer_name || 'N/A'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">Sender Phone</span>
              <span className="font-semibold text-gray-900">{rental.payment_sender_phone || rental.customer_phone || 'N/A'}</span>
            </div>
          </div>

          {/* Receipt Image */}
          {rental.payment_receipt ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex flex-col items-center p-2">
              <img
                src={imageUrl}
                alt="Payment Receipt"
                className="max-h-72 w-auto object-contain rounded-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#1e3a8a] font-semibold pt-2 hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> View Full Resolution
              </a>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
              No receipt image uploaded. (Reference: <span className="font-bold text-gray-800">{rental.payment_ref || 'None'}</span>)
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex gap-3">
          <button
            onClick={onClose}
            type="button"
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
          >
            Close
          </button>
          {rental.status === 'pending' && (
            <button
              onClick={() => {
                onApprove(rental.id);
                onClose();
              }}
              disabled={loading}
              type="button"
              className="flex-1 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-xs font-semibold text-white transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Verify & Approve Rental
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RentalRequests() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectingRental, setRejectingRental] = useState(null);
  const [receiptRental, setReceiptRental] = useState(null);
  const [proofRental, setProofRental] = useState(null);


  const { socket } = useSocket();

  const fetchRentals = () => {
    setLoading(true);
    getRentals()
      .then(res => setRentals(res.data?.data || []))
      .catch(() => toast.error('Failed to load rental requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRentals();

    if (socket) {
      const handleRentalUpdate = () => {
        fetchRentals();
      };
      socket.on('rental_status_changed', handleRentalUpdate);
      socket.on('new_notification', handleRentalUpdate);

      return () => {
        socket.off('rental_status_changed', handleRentalUpdate);
        socket.off('new_notification', handleRentalUpdate);
      };
    }
  }, [socket]);

  const handleStatus = async (rentalId, status, notes = '') => {
    setActionLoading(rentalId + status);
    try {
      await updateRentalStatus(rentalId, status, notes);
      toast.success(`Rental updated to ${status}!`);
      fetchRentals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update rental status');
    } finally {
      setActionLoading(null);
      setRejectingRental(null);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Rental Requests & Workflow</h1>
          <p className="text-sm text-gray-500 mt-1">Manage incoming bookings, verify handovers, and confirm equipment returns.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-xl transition flex items-center gap-2
              ${tab === t ? 'bg-[#1e3a8a] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {t}
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === t ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {tabCounts[t]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl text-center py-16 px-4 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold text-gray-700">No {tab === 'All' ? '' : tab.toLowerCase()} rental requests</p>
          <p className="text-xs text-gray-400 mt-1">Incoming booking requests from customers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => {
            const days = Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / (1000 * 60 * 60 * 24));
            return (
              <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
                <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-base">{r.product_title}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm text-gray-600">
                      <p>
                        Customer: <span className="font-semibold text-gray-900">{r.customer_name}</span>
                      </p>
                      <p>
                        Duration:{' '}
                        <span className="font-medium text-gray-900">
                          {new Date(r.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                          {' — '}
                          {new Date(r.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="text-gray-400 text-xs ml-1.5">({days} day{days !== 1 ? 's' : ''})</span>
                        </span>
                      </p>
                    </div>

                    {r.notes && (
                      <div className="mt-2.5 p-2.5 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100">
                        <span className="font-semibold text-gray-700">Notes / Reason:</span> {r.notes}
                      </div>
                    )}

                    {/* Payment Proof Badge / Quick Inspect */}
                    {(r.payment_ref || r.payment_receipt) && (
                      <div className="mt-2.5 p-2.5 bg-emerald-50 rounded-xl text-xs text-emerald-800 border border-emerald-200/80 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>
                            <strong>{r.payment_method?.toUpperCase() || 'GCASH'}:</strong> {r.payment_status === 'paid' ? 'Paid & Verified' : 'Proof Submitted'}
                            {r.payment_ref && <span className="ml-1 text-emerald-700 font-mono text-[11px]">({r.payment_ref})</span>}
                          </span>
                        </div>
                        <button
                          onClick={() => setProofRental(r)}
                          className="text-[11px] font-bold text-[#1e3a8a] hover:underline bg-white px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Inspect Proof
                        </button>
                      </div>
                    )}

                    {r.status === 'returned' && (
                      <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-purple-700 bg-purple-50 p-2.5 rounded-xl border border-purple-100">
                        <RotateCcw className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        Customer has marked this item as returned. Please inspect and confirm the return to complete the rental.
                      </div>
                    )}
                  </div>

                  {/* Pricing + Action Buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between w-full lg:w-auto gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 flex-shrink-0">
                    <div className="text-left lg:text-right">
                      <span className="text-2xl font-black text-[#1e3a8a]">₱{r.total_price?.toLocaleString()}</span>
                      <span className="text-xs text-gray-400 block font-medium">Rental Total</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Message Customer */}
                      <Link
                        to={`/messages?user=${r.customer_id}`}
                        className="p-2 border border-gray-200 text-gray-600 hover:text-[#1e3a8a] hover:border-[#1e3a8a] rounded-xl transition"
                        title="Chat with customer"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Link>

                      {/* Pending: Approve / Reject */}
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatus(r.id, 'approved')}
                            disabled={!!actionLoading}
                            className="bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold py-2 px-4 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {actionLoading === r.id + 'approved' ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => setRejectingRental(r)}
                            disabled={!!actionLoading}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold py-2 px-3.5 rounded-xl transition flex items-center gap-1 disabled:opacity-60"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </button>
                        </>
                      )}

                      {/* Approved: Hand Over Item */}
                      {r.status === 'approved' && (
                        <button
                          onClick={() => handleStatus(r.id, 'active', 'Item handed over to customer')}
                          disabled={!!actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-4 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                        >
                          <PackageCheck className="w-4 h-4" />
                          {actionLoading === r.id + 'active' ? 'Updating...' : 'Hand Over (Start Rental)'}
                        </button>
                      )}

                      {/* Active: Direct Complete */}
                      {r.status === 'active' && (
                        <button
                          onClick={() => handleStatus(r.id, 'completed', 'Return received and completed')}
                          disabled={!!actionLoading}
                          className="border border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 text-xs font-semibold py-2 px-4 rounded-xl transition flex items-center gap-1.5 disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {actionLoading === r.id + 'completed' ? 'Completing...' : 'Confirm Return & Complete'}
                        </button>
                      )}

                      {/* View Official Receipt */}
                      {['approved', 'active', 'returned', 'completed'].includes(r.status) && (
                        <button
                          onClick={() => setReceiptRental(r)}
                          className="p-2 border border-blue-200 text-[#1e3a8a] bg-blue-50/60 hover:bg-blue-100/80 rounded-xl transition cursor-pointer"
                          title="View Official Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      )}

                      {/* Returned: Verify & Complete */}
                      {r.status === 'returned' && (
                        <button
                          onClick={() => handleStatus(r.id, 'completed', 'Return inspected and verified by supplier')}
                          disabled={!!actionLoading}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2 px-4 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {actionLoading === r.id + 'completed' ? 'Verifying...' : 'Verify Return & Complete'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingRental && (
        <RejectModal
          rental={rejectingRental}
          onClose={() => setRejectingRental(null)}
          onConfirm={(reason) => handleStatus(rejectingRental.id, 'rejected', reason)}
          loading={actionLoading === rejectingRental.id + 'rejected'}
        />
      )}

      {/* Official Receipt Modal */}
      {receiptRental && (
        <ReceiptModal
          rental={receiptRental}
          onClose={() => setReceiptRental(null)}
        />
      )}

      {/* Payment Proof Modal */}
      {proofRental && (
        <ProofModal
          rental={proofRental}
          onClose={() => setProofRental(null)}
          onApprove={(id) => handleStatus(id, 'approved', 'Approved with verified payment proof')}
          loading={actionLoading === proofRental.id + 'approved'}
        />
      )}
    </div>
  );
}