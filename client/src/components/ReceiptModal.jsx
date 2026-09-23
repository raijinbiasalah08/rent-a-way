import { useState, useEffect } from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, MapPin, Calendar, Clock, DollarSign, Download, ArrowUpRight } from 'lucide-react';
import { getPaymentByRental } from '../api/payments';
import LoadingSpinner from './LoadingSpinner';

export default function ReceiptModal({ rental, onClose }) {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (rental?.id) {
      getPaymentByRental(rental.id)
        .then(res => setPaymentData(res.data?.data))
        .catch(() => {
          // If payment not found in payments table, fallback to rental props
          setPaymentData(null);
        })
        .finally(() => setLoading(false));
    }
  }, [rental]);

  const handlePrint = () => {
    window.print();
  };

  const days = rental?.start_date && rental?.end_date
    ? Math.max(1, Math.ceil((new Date(rental.end_date) - new Date(rental.start_date)) / 86400000))
    : 1;

  const totalAmount = paymentData?.amount ?? (rental?.total_price || 0) + (rental?.security_deposit || 0);
  const subtotal = rental?.total_price || (paymentData?.amount ? paymentData.amount - (paymentData.security_deposit || 0) : 0);
  const deposit = paymentData?.security_deposit ?? (rental?.security_deposit || 0);
  const txRef = paymentData?.transaction_ref || rental?.payment_intent_id || `TX-${rental?.id?.slice(0, 8).toUpperCase()}`;
  const paidDate = paymentData?.paid_at ? new Date(paymentData.paid_at) : new Date(rental?.created_at || Date.now());
  const method = (paymentData?.method || 'card').toUpperCase();

  const invoiceNo = `RAW-${rental?.id?.slice(0, 8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 my-8">
        
        {/* Top Action Bar (hidden when printing) */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Official Document</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Verified Receipt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 sm:p-8 space-y-6 text-gray-800 print:p-0 print:m-0" id="receipt-content">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img src="/logo.png" alt="Rent-A-Way Logo" className="w-8 h-8 object-contain" />
                <h1 className="text-xl font-black text-gray-900 tracking-tight">Rent-A-Way</h1>
              </div>
              <p className="text-xs text-gray-500">Find Better Ways to Save · Roxas, Oriental Mindoro</p>
              <p className="text-xs text-gray-400 mt-0.5">https://rentaway.ph · support@rentaway.ph</p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rental Receipt</div>
              <div className="text-base font-extrabold font-mono text-[#1e3a8a] mt-0.5">{invoiceNo}</div>
              <div className="text-xs text-gray-500 mt-1">
                Date: {paidDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="inline-block mt-2 px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                {rental?.status || 'APPROVED'}
              </div>
            </div>
          </div>

          {/* Parties: Renter & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-gray-50/70 border border-gray-100 text-xs">
            <div>
              <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1.5">Rented By (Customer)</div>
              <div className="font-bold text-gray-900 text-sm mb-0.5">{rental?.customer_name || paymentData?.customer_name || 'Verified Renter'}</div>
              {paymentData?.customer_email && <div className="text-gray-600">{paymentData.customer_email}</div>}
              {paymentData?.customer_phone && <div className="text-gray-600">{paymentData.customer_phone}</div>}
              <div className="text-gray-500 mt-1">Registered Account · Roxas, Oriental Mindoro</div>
            </div>

            <div>
              <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1.5">Fulfilled By (Supplier)</div>
              <div className="font-bold text-gray-900 text-sm mb-0.5">{rental?.supplier_name || paymentData?.supplier_name || 'Verified Supplier'}</div>
              {paymentData?.supplier_email && <div className="text-gray-600">{paymentData.supplier_email}</div>}
              {paymentData?.supplier_phone && <div className="text-gray-600">{paymentData.supplier_phone}</div>}
              <div className="flex items-center gap-1 text-gray-600 mt-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span>{rental?.supplier_barangay ? `Brgy. ${rental.supplier_barangay}, Roxas` : (paymentData?.product_barangay ? `Brgy. ${paymentData.product_barangay}, Roxas` : 'Roxas, Oriental Mindoro')}</span>
              </div>
            </div>
          </div>

          {/* Rental Schedule & Specs */}
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#1e3a8a] flex-shrink-0" />
              <div>
                <span className="font-bold text-gray-900">Rental Period: </span>
                <span className="text-gray-700">
                  {new Date(rental?.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' — '}
                  {new Date(rental?.end_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="font-semibold text-[#1e3a8a] px-2.5 py-1 rounded-lg bg-white border border-blue-200">
              {days} Day{days !== 1 ? 's' : ''} Duration
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Equipment Item</th>
                  <th className="py-2.5 px-4 text-center">Days</th>
                  <th className="py-2.5 px-4 text-right">Daily Rate</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900 text-sm">{rental?.product_title || paymentData?.product_title || 'Rental Equipment'}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{rental?.product_category || 'General Equipment'} · Roxas Inventory</div>
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-gray-700">{days}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-700">
                    ₱{Math.round(subtotal / Math.max(1, days)).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    ₱{subtotal.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Rental Subtotal:</span>
                <span className="font-medium text-gray-900">₱{subtotal.toLocaleString()}</span>
              </div>

              {deposit > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    Security Deposit <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  </span>
                  <span className="font-medium text-gray-900">₱{deposit.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Platform Service Fee:</span>
                <span className="font-medium text-emerald-600">Free / Waived</span>
              </div>

              <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-2 border-t-2 border-gray-200">
                <span>Total Paid:</span>
                <span className="text-base text-[#1e3a8a]">₱{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment & Audit Footer */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="text-gray-500">
                Payment Method: <span className="font-semibold text-gray-900">{method}</span>
              </div>
              <div className="text-gray-500 font-mono">
                Transaction Ref: <span className="font-bold text-gray-800">{txRef}</span>
              </div>
              <div className="text-gray-400 text-[11px]">
                Paid on: {paidDate.toLocaleString('en-PH')}
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Paid & Verified by RentAway</span>
            </div>
          </div>

          {/* Legal / Policy Note */}
          <div className="text-[10px] text-gray-400 leading-relaxed border-t border-gray-100 pt-4">
            <p>
              * Security deposit (if applicable) is held in escrow and returned within 24 hours of successful equipment return inspection. Both renter and supplier agree to the RentAway Terms of Service. For disputes or assistance, contact support@rentaway.ph.
            </p>
          </div>
        </div>

        {/* Modal Bottom Close Button (hidden when printing) */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Close Receipt
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#1d4ed8] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>

      </div>
    </div>
  );
}
