import { useState, useEffect } from 'react';
import { Star, MessageSquare, RotateCcw, AlertTriangle } from 'lucide-react';
import { getRentals, updateRentalStatus } from '../../api/rentals';
import { createReview } from '../../api/reviews';
import LoadingSpinner from '../../components/LoadingSpinner';
import ComplaintModal from '../../components/ComplaintModal';
import toast from 'react-hot-toast';

const TABS = ['All', 'Pending', 'Approved', 'Active', 'Completed', 'Cancelled'];

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-blue-100 text-blue-700',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
  returned:  'bg-purple-100 text-purple-700',
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-lg text-navy-700">Write a Review</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
            <span className="font-medium">Product:</span> {rental.product_title}
          </div>
          <div>
            <label className="label mb-2">Your Rating <span className="text-red-400">*</span></label>
            <StarPicker value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
              </p>
            )}
          </div>
          <div>
            <label className="label">Comment <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              className="input h-24 resize-none"
              placeholder="Share your experience with this rental..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MyRentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [actionLoading, setActionLoading] = useState(null);
  const [reviewRental, setReviewRental] = useState(null);
  const [complaintRental, setComplaintRental] = useState(null);
  const [reviewed, setReviewed] = useState(new Set()); // track submitted reviews in session

  const fetchRentals = () => {
    setLoading(true);
    getRentals()
      .then(res => setRentals(res.data?.data || []))
      .catch(() => toast.error('Failed to load rentals'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRentals(); }, []);

  const handleCancel = async (rentalId) => {
    if (!window.confirm('Cancel this rental?')) return;
    setActionLoading(rentalId + '_cancel');
    try {
      await updateRentalStatus(rentalId, 'cancelled');
      toast.success('Rental cancelled');
      fetchRentals();
    } catch {
      toast.error('Failed to cancel rental');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async (rentalId) => {
    if (!window.confirm('Confirm that you have returned this item?')) return;
    setActionLoading(rentalId + '_return');
    try {
      await updateRentalStatus(rentalId, 'returned');
      toast.success('Item marked as returned ✅');
      fetchRentals();
    } catch {
      toast.error('Failed to mark as returned');
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">My Rentals</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-200">
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
          <div className="text-4xl mb-3">📦</div>
          <p className="font-medium">No {tab === 'All' ? '' : tab.toLowerCase()} rentals found</p>
          <p className="text-sm mt-1">Browse products to start renting!</p>
          <a href="/browse" className="btn-primary mt-4 inline-block text-sm">Browse Products</a>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => {
            const days = Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / (1000 * 60 * 60 * 24));
            const isReviewed = reviewed.has(r.id);
            return (
              <div key={r.id} className="card hover:shadow-md transition">
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
                    <h3 className="font-bold text-navy-700 mb-0.5 truncate">{r.product_title}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(r.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                      {' — '}
                      {new Date(r.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className="ml-2 text-gray-400">({days} day{days !== 1 ? 's' : ''})</span>
                    </p>
                    {r.supplier_name && (
                      <p className="text-xs text-gray-400 mt-0.5">Supplier: {r.supplier_name}</p>
                    )}
                    {r.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">"{r.notes}"</p>
                    )}
                  </div>

                  {/* Price & Status */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xl font-extrabold text-navy-700">₱{r.total_price?.toLocaleString()}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>

                {/* Action buttons row */}
                {(r.status === 'pending' || r.status === 'active' || r.status === 'completed' || r.status === 'returned') && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-50">
                    {/* Cancel — pending only */}
                    {r.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={actionLoading === r.id + '_cancel'}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-1.5 transition disabled:opacity-60"
                      >
                        {actionLoading === r.id + '_cancel' ? 'Cancelling...' : '✕ Cancel Rental'}
                      </button>
                    )}

                    {/* Mark as Returned — active only */}
                    {r.status === 'active' && (
                      <button
                        onClick={() => handleReturn(r.id)}
                        disabled={actionLoading === r.id + '_return'}
                        className="text-xs text-purple-600 hover:text-purple-800 font-semibold border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 disabled:opacity-60"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {actionLoading === r.id + '_return' ? 'Processing...' : 'Mark as Returned'}
                      </button>
                    )}

                    {/* Write Review — completed or returned */}
                    {(r.status === 'completed' || r.status === 'returned') && !isReviewed && (
                      <button
                        onClick={() => setReviewRental(r)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-semibold border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-1.5 transition flex items-center gap-1.5"
                      >
                        <Star className="w-3 h-3" />
                        Write a Review
                      </button>
                    )}
                    {isReviewed && (
                      <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3" fill="#f59e0b" stroke="#f59e0b" /> Review Submitted
                      </span>
                    )}

                    {/* File Complaint — any active/completed rental */}
                    {['approved', 'active', 'completed', 'returned'].includes(r.status) && (
                      <button
                        onClick={() => setComplaintRental(r)}
                        className="text-xs text-gray-500 hover:text-red-600 font-semibold border border-gray-200 hover:border-red-200 bg-gray-50 hover:bg-red-50 rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ml-auto"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Report Issue
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {reviewRental && (
        <ReviewModal
          rental={reviewRental}
          onClose={() => setReviewRental(null)}
          onSuccess={() => setReviewed(prev => new Set([...prev, reviewRental.id]))}
        />
      )}

      {complaintRental && (
        <ComplaintModal
          reportedId={complaintRental.product_id}
          context={`Rental: ${complaintRental.product_title}`}
          onClose={() => setComplaintRental(null)}
        />
      )}
    </div>
  );
}