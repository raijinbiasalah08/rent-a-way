import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Calendar, Package, Lock, CheckCircle2 } from 'lucide-react';
import { getProduct } from '../../api/products';
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
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    if (!productId || !startDateStr || !endDateStr) {
      navigate('/browse');
      return;
    }
    
    getProduct(productId)
      .then(res => setProduct(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [productId, startDateStr, endDateStr, navigate]);

  if (loading) return <div className="min-h-screen bg-[#f5f0e8] flex justify-center items-center">Loading checkout...</div>;
  if (!product) return <div className="min-h-screen bg-[#f5f0e8] flex justify-center items-center">Product not found.</div>;

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const days = Math.max(1, Math.ceil((endDate - startDate) / 86400000));
  
  const subtotal = days * product.price_per_day;
  const platformFee = subtotal * 0.05;
  const protectionFee = protection ? 250 : 0;
  const securityDeposit = product.price_per_day * 0.5; // Example dynamic deposit
  const total = subtotal + platformFee + protectionFee;
  const amountToHold = total + securityDeposit;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvc) {
      toast.error('Please fill in all card details.');
      return;
    }

    setProcessing(true);
    
    try {
      // Step 1: Create Checkout Session
      const sessionRes = await fetch(`${BASE_URL}/api/payments/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          product_id: product.id,
          start_date: startDateStr,
          end_date: endDateStr,
          total_price: total,
          security_deposit: securityDeposit,
          notes: ''
        })
      });
      const sessionData = await sessionRes.json();
      
      if (!sessionData.success) throw new Error(sessionData.message);

      // Simulate network delay for Stripe processing
      await new Promise(r => setTimeout(r, 2000));

      // Step 2: Confirm Payment
      const confirmRes = await fetch(`${BASE_URL}/api/payments/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          rentalId: sessionData.data.rentalId,
          paymentIntentId: sessionData.data.paymentIntentId,
          method: 'card'
        })
      });
      const confirmData = await confirmRes.json();
      
      if (!confirmData.success) throw new Error(confirmData.message);

      setSuccess(true);
      toast.success('Payment successful!');
    } catch (err) {
      toast.error(err.message || 'Payment failed.');
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Your secure payment has been processed and your reservation for <b>{product.title}</b> is locked in. The supplier will be notified immediately.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/customer/rentals" className="bg-[#1e3a8a] text-white font-semibold py-3 rounded-xl hover:bg-[#1d4ed8] transition">
              View My Rentals
            </Link>
            <Link to="/browse" className="text-gray-500 font-medium hover:text-gray-900 py-2 transition">
              Continue Browsing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-sans py-12">
      <div className="max-w-6xl mx-auto px-4 flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Col: Payment Form */}
        <div className="w-full lg:flex-1">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-500 mb-8">You are securely booking this item.</p>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-600" /> Secure Payment (Simulated)
            </h2>
            <form onSubmit={handleCheckout} className="space-y-5">
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Card Number</label>
                <input 
                  type="text" 
                  value={cardNumber} 
                  onChange={e => setCardNumber(e.target.value)} 
                  placeholder="0000 0000 0000 0000" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1e3a8a] transition"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Expiry Date</label>
                  <input 
                    type="text" 
                    value={expiry} 
                    onChange={e => setExpiry(e.target.value)} 
                    placeholder="MM/YY" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1e3a8a] transition"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">CVC</label>
                  <input 
                    type="text" 
                    value={cvc} 
                    onChange={e => setCvc(e.target.value)} 
                    placeholder="123" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1e3a8a] transition"
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 mt-6">
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  By clicking "Confirm & Pay", you agree to Rent-A-Way's Terms of Service and Rental Agreement. You authorize Rent-A-Way to hold the Security Deposit on your card.
                </p>
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-xl hover:bg-[#1d4ed8] disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {processing ? 'Processing Securely...' : `Confirm & Pay ₱${amountToHold.toLocaleString()}`}
                  {!processing && <Lock className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: Order Summary */}
        <div className="w-full lg:w-96 lg:sticky lg:top-24">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex gap-4 items-center">
              <img src={product.primary_image?.startsWith('http') ? product.primary_image : `${BASE_URL}${product.primary_image}`} alt={product.title} className="w-16 h-16 rounded-lg object-cover" />
              <div>
                <div className="text-xs text-gray-500 tracking-widest uppercase font-bold mb-0.5">Order Summary</div>
                <div className="text-sm font-bold text-gray-900 line-clamp-2">{product.title}</div>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}</div>
                  <div className="text-xs text-gray-500">{days} day{days !== 1 ? 's' : ''}</div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600 border-b border-gray-100 pb-4 mb-4">
                <div className="flex justify-between">
                  <span>₱{product.price_per_day.toLocaleString()} × {days} days</span>
                  <span>₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (5%)</span>
                  <span>₱{platformFee.toLocaleString()}</span>
                </div>
                {protection && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-green-600" /> Damage Protection</span>
                    <span>₱{protectionFee.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between font-bold text-gray-900 text-lg mb-4">
                <span>Rental Total</span>
                <span>₱{total.toLocaleString()}</span>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex justify-between font-semibold text-amber-900 mb-1 text-sm">
                  <span>Refundable Deposit</span>
                  <span>₱{securityDeposit.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-amber-700 leading-tight">
                  This amount will be placed on hold on your card and fully refunded upon safe return of the item.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
