import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getProduct } from '../../api/products';
import { createRental } from '../../api/rentals';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const BASE_URL = 'http://localhost:5000';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const query = new URLSearchParams(location.search);
  const productId = query.get('product_id');
  const startDateStr = query.get('start_date');
  const endDateStr = query.get('end_date');
  const protection = query.get('protection') === 'true';

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!productId || !startDateStr || !endDateStr) {
      navigate('/browse');
      return;
    }

    getProduct(productId)
      .then((res) => setProduct(res.data?.data))
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load item details');
      })
      .finally(() => setLoading(false));
  }, [productId, startDateStr, endDateStr, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex justify-center items-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-600">Loading booking checkout...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center items-center p-4">
        <p className="text-base font-bold text-gray-800 mb-3">Product not found.</p>
        <Link to="/browse" className="btn-primary text-xs py-2.5 px-4 rounded-xl">
          Back to Browse
        </Link>
      </div>
    );
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const days = Math.max(1, Math.ceil((endDate - startDate) / 86400000));

  const subtotal = days * product.price_per_day;
  const platformFee = Math.round(subtotal * 0.05);
  const protectionFee = protection ? 250 : 0;
  const securityDeposit = product.price_per_day * 0.5; // Example refundable deposit
  const total = subtotal + platformFee + protectionFee;

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to complete your booking');
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createRental({
        product_id: product.id,
        start_date: startDateStr,
        end_date: endDateStr,
        notes: notes.trim() || undefined,
        security_deposit: securityDeposit
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to submit rental request');
      }

      toast.success('Rental request submitted! Proceeding to pending requests... 🎉', {
        duration: 4000
      });

      // Proceed directly to the customer's pending requests tab
      navigate('/customer/rentals?tab=pending');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit rental request');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Page Title */}
        <div className="mb-8">
          <span className="text-[11px] uppercase tracking-widest font-extrabold text-[#1e3a8a] bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full">
            Booking & Rental Request
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-2">Confirm Your Rental</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review your rental schedule and submit your request directly to the supplier.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Column: Rental Details & Submission Form */}
          <div className="w-full lg:flex-1 space-y-6">
            {/* Renter Information Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-6 sm:p-7">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[#1e3a8a]" /> Renter Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">Full Name</span>
                  <span className="font-bold text-gray-900 text-sm">{user?.name || 'Customer'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">Contact Email</span>
                  <span className="font-semibold text-gray-900 text-xs truncate block">{user?.email || 'N/A'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">Phone Number</span>
                  <span className="font-semibold text-gray-900 text-xs">{user?.phone || 'Provided upon coordination'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">Location</span>
                  <span className="font-semibold text-gray-900 text-xs">
                    {user?.barangay ? `Brgy. ${user.barangay}, Roxas` : 'Roxas, Oriental Mindoro'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rental Schedule & Notes Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-6 sm:p-7 space-y-5">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1e3a8a]" /> Rental Schedule
              </h2>

              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-gray-400 uppercase text-[10px] font-bold block">Start Date</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {startDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="hidden sm:block text-gray-300 font-bold">→</div>
                <div>
                  <span className="text-gray-400 uppercase text-[10px] font-bold block">End Date</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {endDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="sm:border-l sm:border-blue-200 sm:pl-4">
                  <span className="text-gray-400 uppercase text-[10px] font-bold block">Duration</span>
                  <span className="font-black text-[#1e3a8a] text-sm">
                    {days} day{days !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Special Notes or Instructions */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                  Notes / Requests for Supplier <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Preferred pickup time, specific accessories needed, or handover location..."
                  rows={3}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none transition"
                />
              </div>

              {/* Informational callout on Pending Workflow */}
              <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  What happens when you submit:
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-800/90 text-[11.5px] pl-1">
                  <li>Your request is recorded with <strong>Pending</strong> status and the supplier is alerted.</li>
                  <li>You will proceed straight to your <strong>Pending Requests</strong> dashboard.</li>
                  <li>You can scan the supplier's <strong>GCash / Maya QR</strong> and upload payment proof at any time.</li>
                </ul>
              </div>

              {/* Submit & Proceed to Pending Button */}
              <form onSubmit={handleSubmitRequest} className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    'Submitting Request...'
                  ) : (
                    <>
                      <span>Confirm & Proceed to Pending Request</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-gray-400 text-center mt-2.5">
                  By clicking above, you agree to Rent-A-Way Roxas rental terms and equipment care guidelines.
                </p>
              </form>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="w-full lg:w-96 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
              {/* Product Header */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex gap-3.5 items-center">
                <img
                  src={
                    product.primary_image?.startsWith('http')
                      ? product.primary_image
                      : `${BASE_URL}${product.primary_image || (product.images?.[0]?.url || '')}`
                  }
                  alt={product.title}
                  className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                  onError={(e) => {
                    e.target.src = `https://placehold.co/96x96/1a237e/f5f0dc?text=${encodeURIComponent(
                      product.title?.[0] || 'P'
                    )}`;
                  }}
                />
                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                    {product.category}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 truncate">{product.title}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="truncate">
                      {product.barangay ? `Brgy. ${product.barangay}` : 'Roxas, Mindoro'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Price Calculation Details */}
              <div className="p-5 space-y-4">
                <div className="space-y-2.5 text-xs text-gray-600 border-b border-gray-100 pb-4">
                  <div className="flex justify-between items-center">
                    <span>
                      Daily Rate (₱{product.price_per_day?.toLocaleString()} × {days} days)
                    </span>
                    <span className="font-semibold text-gray-900">₱{subtotal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Platform Service Fee (5%)</span>
                    <span className="font-semibold text-gray-900">₱{platformFee.toLocaleString()}</span>
                  </div>

                  {protection && (
                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Damage Protection Plan
                      </span>
                      <span className="font-bold">₱{protectionFee.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Rental Total */}
                <div className="flex justify-between items-baseline font-bold text-gray-900">
                  <span className="text-sm">Total Rental Fee</span>
                  <span className="text-2xl font-black text-[#1e3a8a]">₱{total.toLocaleString()}</span>
                </div>

                {/* Refundable Deposit Notice */}
                <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200/70 text-xs">
                  <div className="flex justify-between font-bold text-amber-900 mb-0.5">
                    <span>Refundable Deposit</span>
                    <span>₱{securityDeposit.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 leading-snug">
                    Deposit is held by the supplier/escrow and refunded immediately upon item return in original condition.
                  </p>
                </div>

                {/* Supplier escrows */}
                <div className="pt-2 text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Protected by RentAway Escrow Roxas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
