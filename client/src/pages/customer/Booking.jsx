import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct } from '../../api/products';
import { createRental } from '../../api/rentals';
import PaymentModal from '../../components/PaymentModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const BASE_URL = 'http://localhost:5000';

export default function Booking() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rental, setRental] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    getProduct(productId)
      .then(res => setProduct(res.data?.data))
      .catch(() => { toast.error('Product not found'); navigate('/browse'); })
      .finally(() => setLoading(false));
  }, [productId]);

  const days = startDate && endDate
    ? Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
    : 0;
  const total = days > 0 ? days * (product?.price_per_day || 0) : 0;

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return toast.error('Please select rental dates');
    if (days <= 0) return toast.error('End date must be after start date');
    if (product?.min_days && days < product.min_days) return toast.error(`Minimum rental is ${product.min_days} day(s)`);
    if (product?.max_days && days > product.max_days) return toast.error(`Maximum rental is ${product.max_days} day(s)`);

    setSubmitting(true);
    try {
      const res = await createRental({ product_id: productId, start_date: startDate, end_date: endDate, notes });
      const createdRental = res.data?.data;
      setRental(createdRental);
      toast.success('Rental request submitted!');
      setShowPayment(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create rental');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;
  if (!product) return null;

  const primaryImage = product.images?.find(i => i.is_primary)?.url || product.images?.[0]?.url;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Complete Your Booking</h1>

      <form onSubmit={handleSubmit}>
        <div className="card space-y-6">
          {/* Product Summary */}
          <div className="flex gap-4 items-start pb-4 border-b border-gray-100">
            <img
              src={primaryImage ? `${BASE_URL}${primaryImage}` : `https://placehold.co/96x96/1a237e/f5f0dc?text=${encodeURIComponent(product.title?.[0] || 'P')}`}
              alt={product.title}
              className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
              onError={e => { e.target.src = 'https://placehold.co/96x96/1a237e/f5f0dc?text=P'; }}
            />
            <div>
              <h2 className="text-xl font-bold text-navy-700 mb-1">{product.title}</h2>
              <p className="text-gray-500 text-sm mb-1">by {product.supplier_name}</p>
              <p className="text-navy-700 font-bold text-lg">₱{product.price_per_day?.toLocaleString()} <span className="text-sm font-normal text-gray-500">/ day</span></p>
              {(product.min_days || product.max_days) && (
                <p className="text-xs text-gray-400 mt-1">
                  {product.min_days && `Min: ${product.min_days} day(s)`}
                  {product.min_days && product.max_days && ' · '}
                  {product.max_days && `Max: ${product.max_days} day(s)`}
                </p>
              )}
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                min={today}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value >= endDate) setEndDate(''); }}
                required
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                min={startDate || today}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Duration Display */}
          {days > 0 && (
            <div className="bg-navy-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-bold text-navy-700">{days} day{days !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Rate</p>
                <p className="text-sm text-gray-600">₱{product.price_per_day?.toLocaleString()} × {days}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">Notes to Supplier <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              className="input h-24 resize-none"
              placeholder="Any special requests or details for the supplier..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Total & Submit */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center mb-5">
              <span className="font-bold text-lg text-gray-700">Total Amount</span>
              <span className="text-2xl font-extrabold text-navy-700">
                {days > 0 ? `₱${total.toLocaleString()}` : '—'}
              </span>
            </div>
            <button
              type="submit"
              disabled={submitting || days <= 0}
              className="btn-primary w-full py-3 text-base disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Confirm & Proceed to Payment'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              You'll be asked to pay after submitting the rental request.
            </p>
          </div>
        </div>
      </form>

      {showPayment && rental && (
        <PaymentModal
          rental={rental}
          onClose={() => { setShowPayment(false); navigate('/customer/rentals'); }}
          onSuccess={() => { setShowPayment(false); navigate('/customer/rentals'); }}
        />
      )}
    </div>
  );
}