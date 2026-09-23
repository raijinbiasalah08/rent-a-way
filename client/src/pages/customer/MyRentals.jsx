import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star, MessageSquare, RotateCcw, AlertTriangle, XCircle, CheckCircle2, MessageCircle, Clock, Info, Receipt, CreditCard } from 'lucide-react';
import { getRentals, updateRentalStatus } from '../../api/rentals';
import { createReview } from '../../api/reviews';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ComplaintModal from '../../components/ComplaintModal';
import ReceiptModal from '../../components/ReceiptModal';
import PaymentModal from '../../components/PaymentModal';
import toast from 'react-hot-toast';


const TABS = ['All', 'Pending', 'Approved', 'Active', 'Returned', 'Completed', 'Cancelled'];

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  returned: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

const BASE_URL = 'http://localhost:5000';

// ── Star Picker ───────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition"
        >
          <Star
            className="w-7 h-7 transition"
            fill={(hovered || value) >= n ? '#f59e0b' : 'none'}
            stroke={(hovered || value) >= n ? '#f59e0b' : '#d1d5db'}
          />
        </button>
      ))}
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────
function ReviewModal({ rental, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1) return toast.error('Please select a rating');
    setSubmitting(true);
    try {
      await createReview({ product_id: rental.product_id, rating, comment });
      toast.success('Review submitted! Thank you 🎉');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900">Write a Review</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 border border-gray-100">
            <span className="font-medium text-gray-900">Product:</span> {rental.product_title}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Your Rating <span className="text-red-400">*</span></label>
            <StarPicker value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-xs text-amber-600 mt-1.5 font-medium">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Comment <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:border-[#1e3a8a] outline-none h-24 resize-none"
              placeholder="Share your experience with this rental..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-sm font-semibold hover:bg-[#1d4ed8] transition disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Cancel Modal ──────────────────────────────────────────────────────────────
function CancelModal({ rental, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  const cancelReasons = [
    'Change of plans / No longer needed',
    'Found another equipment option',
    'Dates or schedule changed',
    'Booked by mistake',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" /> Cancel Rental
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to cancel your rental for <span className="font-semibold text-gray-900">{rental.product_title}</span>?
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Reason for cancellation:</label>
            <div className="space-y-1.5 mb-3">
              {cancelReasons.map(r => (
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
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:border-[#1e3a8a] outline-none"
              placeholder="Additional details (optional)..."
              rows={2}
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
              Keep Rental
            </button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={loading}
              type="button"
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition disabled:opacity-60"
            >
              {loading ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Return Confirmation Modal ─────────────────────────────────────────────────
function ReturnModal({ rental, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-purple-600" /> Mark as Returned
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Have you handed over or returned <span className="font-semibold text-gray-900">{rental.product_title}</span> to the supplier?
          </p>
          <div className="bg-purple-50 rounded-xl p-3 text-xs text-purple-800 border border-purple-100">
            Once submitted, the supplier will be notified to inspect the equipment and confirm completion.
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
              onClick={onConfirm}
              disabled={loading}
              type="button"
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-sm font-semibold text-white transition disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Yes, Mark Returned'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyRentals() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(
    initialTab && TABS.some(t => t.toLowerCase() === initialTab.toLowerCase())
      ? TABS.find(t => t.toLowerCase() === initialTab.toLowerCase())
      : 'All'
  );
  const [actionLoading, setActionLoading] = useState(null);

  const [reviewRental, setReviewRental] = useState(null);
  const [complaintRental, setComplaintRental] = useState(null);
  const [cancellingRental, setCancellingRental] = useState(null);
  const [returningRental, setReturningRental] = useState(null);
  const [receiptRental, setReceiptRental] = useState(null);
  const [payingRental, setPayingRental] = useState(null);
  const [reviewed, setReviewed] = useState(new Set());


  const { socket } = useSocket();

  const fetchRentals = () => {
    setLoading(true);
    getRentals()
      .then(res => setRentals(res.data?.data || []))
      .catch(() => toast.error('Failed to load your rentals'))
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

  const handleCancelConfirm = async (reason) => {
    if (!cancellingRental) return;
    setActionLoading(cancellingRental.id + '_cancel');
    try {
      await updateRentalStatus(cancellingRental.id, 'cancelled', reason);
      toast.success('Rental cancelled successfully.');
      fetchRentals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel rental');
    } finally {
      setActionLoading(null);
      setCancellingRental(null);
    }
  };

  const handleReturnConfirm = async () => {
    if (!returningRental) return;
    setActionLoading(returningRental.id + '_return');
    try {
      await updateRentalStatus(returningRental.id, 'returned', 'Marked as returned by customer');
      toast.success('Item marked as returned! Supplier has been notified.');
      fetchRentals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update rental');
    } finally {
      setActionLoading(null);
      setReturningRental(null);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Rentals</h1>
          <p className="text-sm text-gray-500 mt-1">Track your active bookings, pickup schedules, and return statuses.</p>
        </div>
        <Link
          to="/browse"
          className="bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          Explore More Equipment
        </Link>
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
          <div className="text-4xl mb-3">📦</div>
          <p className="font-semibold text-gray-700">No {tab === 'All' ? '' : tab.toLowerCase()} rentals found</p>
          <p className="text-xs text-gray-400 mt-1">Ready to rent? Browse thousands of items across Metro Manila.</p>
          <Link to="/browse" className="btn-primary mt-4 inline-block text-xs py-2 px-4 rounded-xl">
            Browse Equipment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => {
            const days = Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / (1000 * 60 * 60 * 24));
            const isReviewed = reviewed.has(r.id);
            return (
              <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {/* Image */}
                  <img
                    src={r.primary_image ? (r.primary_image.startsWith('http') ? r.primary_image : `${BASE_URL}${r.primary_image}`) : `https://placehold.co/80x80/1a237e/f5f0dc?text=${encodeURIComponent(r.product_title?.[0] || 'P')}`}
                    alt={r.product_title}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    onError={e => { e.target.src = 'https://placehold.co/80x80/1a237e/f5f0dc?text=P'; }}
                  />

                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-base truncate">{r.product_title}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      {new Date(r.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                      {' — '}
                      {new Date(r.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className="ml-2 text-gray-400 text-xs">({days} day{days !== 1 ? 's' : ''})</span>
                    </p>

                    {r.supplier_name && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <span>Supplier:</span>
                        <span className="font-semibold text-gray-700">{r.supplier_name}</span>
                        <Link
                          to={`/messages?user=${r.supplier_id}`}
                          className="text-[#1e3a8a] hover:underline flex items-center gap-1 text-[11px] font-bold ml-2"
                        >
                          <MessageCircle className="w-3 h-3" /> Message
                        </Link>
                      </p>
                    )}

                    {r.notes && (
                      <p className="text-xs text-gray-500 mt-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100 italic">
                        "{r.notes}"
                      </p>
                    )}

                    {/* Helpful status contextual hints */}
                    {r.status === 'pending' && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                        <Clock className="w-3.5 h-3.5" /> Waiting for the supplier to accept your booking request.
                      </div>
                    )}
                    {r.status === 'approved' && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700 font-medium">
                        <Info className="w-3.5 h-3.5" /> Booking confirmed! Message the supplier to coordinate pickup.
                      </div>
                    )}
                    {r.status === 'active' && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Rental currently active. Return the item before the end date.
                      </div>
                    )}
                    {r.status === 'returned' && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-700 font-medium">
                        <RotateCcw className="w-3.5 h-3.5" /> Return submitted. Waiting for supplier verification.
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-2xl font-black text-[#1e3a8a]">₱{r.total_price?.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">Total Price</span>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  {/* Pay / Upload Proof: pending or approved */}
                  {['pending', 'approved'].includes(r.status) && (
                    <button
                      onClick={() => setPayingRental(r)}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-xl px-3.5 py-1.5 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Pay / Upload Proof
                    </button>
                  )}

                  {/* Cancel: pending or approved (before handover) */}
                  {(r.status === 'pending' || r.status === 'approved') && (
                    <button
                      onClick={() => setCancellingRental(r)}
                      disabled={actionLoading === r.id + '_cancel'}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl px-3.5 py-1.5 transition flex items-center gap-1.5 disabled:opacity-60"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel Rental
                    </button>
                  )}

                  {/* Mark as Returned: active only */}
                  {r.status === 'active' && (
                    <button
                      onClick={() => setReturningRental(r)}
                      disabled={actionLoading === r.id + '_return'}
                      className="text-xs text-purple-700 hover:text-purple-800 font-semibold border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-xl px-4 py-1.5 transition flex items-center gap-1.5 disabled:opacity-60 shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Mark as Returned
                    </button>
                  )}

                  {/* Write Review: completed or returned */}
                  {(r.status === 'completed' || r.status === 'returned') && !isReviewed && (
                    <button
                      onClick={() => setReviewRental(r)}
                      className="text-xs text-amber-700 hover:text-amber-800 font-semibold border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-xl px-3.5 py-1.5 transition flex items-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5" />
                      Write a Review
                    </button>
                  )}

                  {isReviewed && (
                    <span className="text-xs text-amber-600 font-semibold flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-xl border border-amber-100">
                      <Star className="w-3 h-3" fill="#f59e0b" stroke="#f59e0b" /> Review Submitted
                    </span>
                  )}

                  {/* Official Receipt: approved, active, returned, completed */}
                  {['approved', 'active', 'returned', 'completed'].includes(r.status) && (
                    <button
                      onClick={() => setReceiptRental(r)}
                      className="text-xs text-[#1e3a8a] hover:text-blue-900 font-semibold border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 rounded-xl px-3.5 py-1.5 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Official Receipt
                    </button>
                  )}

                  {/* Report Issue: active, approved, completed, returned */}
                  {['approved', 'active', 'completed', 'returned'].includes(r.status) && (
                    <button
                      onClick={() => setComplaintRental(r)}
                      className="text-xs text-gray-500 hover:text-red-600 font-semibold border border-gray-200 hover:border-red-200 bg-gray-50 hover:bg-red-50 rounded-xl px-3.5 py-1.5 transition flex items-center gap-1.5 ml-auto"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Report Issue
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {receiptRental && (
        <ReceiptModal
          rental={receiptRental}
          onClose={() => setReceiptRental(null)}
        />
      )}

      {reviewRental && (
        <ReviewModal
          rental={reviewRental}
          onClose={() => setReviewRental(null)}
          onSuccess={() => setReviewed(prev => new Set([...prev, reviewRental.id]))}
        />
      )}

      {cancellingRental && (
        <CancelModal
          rental={cancellingRental}
          onClose={() => setCancellingRental(null)}
          onConfirm={handleCancelConfirm}
          loading={actionLoading === cancellingRental.id + '_cancel'}
        />
      )}

      {returningRental && (
        <ReturnModal
          rental={returningRental}
          onClose={() => setReturningRental(null)}
          onConfirm={handleReturnConfirm}
          loading={actionLoading === returningRental.id + '_return'}
        />
      )}

      {complaintRental && (
        <ComplaintModal
          reportedId={complaintRental.product_id}
          context={`Rental: ${complaintRental.product_title}`}
          onClose={() => setComplaintRental(null)}
        />
      )}

      {payingRental && (
        <PaymentModal
          rental={payingRental}
          onClose={() => setPayingRental(null)}
          onSuccess={() => {
            setPayingRental(null);
            fetchRentals();
          }}
        />
      )}
    </div>
  );
}