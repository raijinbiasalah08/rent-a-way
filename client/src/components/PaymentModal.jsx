import { useState } from 'react';
import { X, QrCode, CreditCard, Building2, Wallet } from 'lucide-react';
import { processPayment } from '../api/payments';
import toast from 'react-hot-toast';

export default function PaymentModal({ rental, onSuccess, onClose }) {
  const [method, setMethod] = useState('gcash');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!rental?.id) return toast.error('No rental found');
    setLoading(true);
    try {
      await processPayment(rental.id, method);
      toast.success('Payment successful! 🎉');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'gcash', icon: Wallet, label: 'GCash' },
    { id: 'maya', icon: Wallet, label: 'Maya' },
    { id: 'card', icon: CreditCard, label: 'Card' },
    { id: 'bank', icon: Building2, label: 'Bank' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"><X /></button>
        <div className="bg-navy-700 p-6 text-white text-center">
          <h2 className="text-xl font-bold mb-1">Complete Payment</h2>
          <p className="opacity-80 text-sm">Total: <span className="font-bold text-gold">₱{rental?.total_price?.toLocaleString() || 0}</span></p>
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setMethod(t.id)} className={`flex-1 py-2 text-xs font-semibold rounded flex flex-col items-center gap-1 transition ${method === t.id ? 'bg-white shadow text-navy-700' : 'text-gray-500 hover:text-gray-700'}`}>
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>
          
          <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
            {method === 'gcash' || method === 'maya' ? (
              <div className="space-y-4">
                <div className="w-32 h-32 bg-navy-50 flex items-center justify-center mx-auto rounded border-2 border-dashed border-navy-200">
                  <QrCode size={48} className="text-navy-300" />
                </div>
                <p className="text-sm font-semibold">{method === 'gcash' ? '0917-123-4567' : '0918-987-6543'}</p>
                <p className="text-xs text-gray-500">Scan QR or send to number above</p>
              </div>
            ) : method === 'bank' ? (
              <div className="space-y-2 text-left w-full bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-semibold">BDO Unibank</p>
                <p className="text-sm">Account: 002-345-678-9</p>
                <p className="text-sm">Name: RentAway Inc.</p>
              </div>
            ) : (
              <div className="space-y-3 w-full text-left">
                <input className="input" placeholder="Card Number" type="text" />
                <div className="flex gap-3">
                  <input className="input w-1/2" placeholder="MM/YY" type="text" />
                  <input className="input w-1/2" placeholder="CVC" type="text" />
                </div>
                <input className="input" placeholder="Cardholder Name" type="text" />
              </div>
            )}
          </div>
          <button disabled={loading} onClick={handlePay} className="btn-primary w-full mt-6 disabled:opacity-60">
            {loading ? 'Processing...' : method === 'card' ? 'Pay Now' : "I've Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}