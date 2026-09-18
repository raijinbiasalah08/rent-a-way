import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PaymentModal from '../../components/PaymentModal';

export default function Booking() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Complete Your Booking</h1>
      <div className="card space-y-6">
        <div className="flex gap-4">
          <div className="w-24 h-24 bg-gray-200 rounded"></div>
          <div>
            <h2 className="text-xl font-bold">Sony A7III Camera</h2>
            <p className="text-gray-500">₱1,500 / day</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Start Date</label><input type="date" className="input" /></div>
          <div><label className="label">End Date</label><input type="date" className="input" /></div>
        </div>
        <div>
          <label className="label">Notes to Supplier</label>
          <textarea className="input h-24" placeholder="Any special requests?"></textarea>
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between font-bold text-xl mb-4">
            <span>Total</span>
            <span>₱4,500</span>
          </div>
          <button onClick={() => setShowPayment(true)} className="btn-primary w-full">Confirm & Pay</button>
        </div>
      </div>
      {showPayment && (
        <PaymentModal 
          rental={{ id: 1, total_price: 4500 }} 
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); navigate('/customer/rentals'); }} 
        />
      )}
    </div>
  );
}