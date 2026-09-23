import { useState, useEffect, useRef } from 'react';
import {
  X,
  CreditCard,
  Building2,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Upload,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  processPayment,
  createPayMongoSession,
  getSupplierPaymentAccount,
  submitPaymentProof
} from '../api/payments';
import toast from 'react-hot-toast';

const BASE_URL = 'http://localhost:5000';

export default function PaymentModal({ rental, onSuccess, onClose }) {
  const [method, setMethod] = useState('gcash');
  const [loading, setLoading] = useState(false);
  const [supplierAccount, setSupplierAccount] = useState(null);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Proof submission fields
  const [transactionRef, setTransactionRef] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const fileInputRef = useRef(null);

  // Fetch supplier payment account info
  useEffect(() => {
    if (rental?.product_id) {
      getSupplierPaymentAccount(rental.product_id)
        .then((res) => {
          if (res.data?.success) {
            setSupplierAccount(res.data.data);
          }
        })
        .catch(() => {
          // Fallback defaults if call fails
        });
    }
  }, [rental?.product_id]);

  const activeAccount = method === 'gcash'
    ? (supplierAccount?.gcash || {
        number: '0917-888-7692',
        name: 'RentAway Escrow Roxas',
        qr: null
      })
    : method === 'maya'
    ? (supplierAccount?.maya || {
        number: '0918-999-3124',
        name: 'RentAway Escrow Roxas',
        qr: null
      })
    : null;

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text.replace(/[^0-9]/g, ''));
    setCopiedNumber(true);
    toast.success('Account number copied!');
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Please upload an image receipt (.jpg, .png, etc.)');
    }
    if (file.size > 10 * 1024 * 1024) {
      return toast.error('Image size must be under 10MB');
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setReceiptPreview(event.target?.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 1. REAL GCASH / MAYA PROOF SUBMISSION (No Merchant Gateway Needed)
  const handleSubmitProof = async (e) => {
    e?.preventDefault();
    if (!rental?.id) return toast.error('Rental record missing');
    if (!transactionRef.trim()) {
      return toast.error(`Please enter your ${method.toUpperCase()} Reference Number`);
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('rentalId', rental.id);
      formData.append('method', method);
      formData.append('transaction_ref', transactionRef.trim());
      if (senderName.trim()) formData.append('sender_name', senderName.trim());
      if (senderPhone.trim()) formData.append('sender_phone', senderPhone.trim());
      if (receiptFile) formData.append('receipt', receiptFile);

      const res = await submitPaymentProof(formData);
      if (res.data?.success) {
        toast.success('Payment proof submitted successfully! 🎉');
        onSuccess();
      } else {
        throw new Error(res.data?.message || 'Submission failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit payment proof');
    } finally {
      setLoading(false);
    }
  };

  // 2. AUTOMATED GATEWAY VIA PAYMONGO (Optional gateway checkout)
  const handlePayMongo = async () => {
    if (!rental?.id) return toast.error('No rental found');
    setLoading(true);
    try {
      const res = await createPayMongoSession({ rentalId: rental.id });
      if (!res.data?.success) throw new Error(res.data?.message);
      const { checkoutUrl } = res.data.data;
      toast.success('Redirecting to PayMongo Checkout...');
      window.location.href = checkoutUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to initialize PayMongo');
      setLoading(false);
    }
  };

  // 3. DIRECT TEST CONFIRMATION (Fallback)
  const handleDirectConfirm = async () => {
    if (!rental?.id) return toast.error('No rental found');
    setLoading(true);
    try {
      await processPayment(rental.id, method);
      toast.success('Payment confirmed successfully! 🎉');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'gcash', icon: Wallet, label: 'GCash' },
    { id: 'maya', icon: Wallet, label: 'Maya' },
    { id: 'bank', icon: Building2, label: 'Bank Transfer' },
    { id: 'card', icon: CreditCard, label: 'Card / Gateway' },
  ];

  const totalAmount = rental?.total_price || 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-800 to-navy-900 p-5 text-white text-center relative border-b border-navy-700">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-[11px] uppercase tracking-widest font-bold text-navy-200 bg-navy-700/60 px-2.5 py-0.5 rounded-full border border-navy-600 inline-block mb-1.5">
            RentAway Secure Checkout
          </span>
          <h2 className="text-xl font-bold">Complete Rental Payment</h2>
          <p className="text-xs text-navy-200 mt-1">
            Total Amount Due:{' '}
            <span className="font-extrabold text-gold text-base ml-1">₱{totalAmount.toLocaleString()}</span>
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Method Tabs */}
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
            {tabs.map((t) => {
              const active = method === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setMethod(t.id)}
                  type="button"
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex flex-col items-center gap-1 transition ${
                    active
                      ? 'bg-white shadow-sm text-navy-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                  }`}
                >
                  <t.icon className={`w-4 h-4 ${active ? 'text-[#1e3a8a]' : 'text-gray-400'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* GCash / Maya Real Payment QR and Proof Upload */}
          {(method === 'gcash' || method === 'maya') && (
            <div className="space-y-4">
              {/* Account QR Card */}
              <div
                className={`p-4 rounded-2xl border text-center transition ${
                  method === 'gcash'
                    ? 'bg-gradient-to-b from-blue-50/70 to-blue-100/40 border-blue-200'
                    : 'bg-gradient-to-b from-emerald-50/70 to-emerald-100/40 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white ${
                      method === 'gcash' ? 'bg-[#007DFE]' : 'bg-[#00D664]'
                    }`}
                  >
                    Official {method.toUpperCase()} QR
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Roxas Mindoro Escrow
                  </span>
                </div>

                {/* QR Code Graphic or Custom Image */}
                <div className="w-40 h-40 mx-auto bg-white p-2.5 rounded-2xl shadow-sm border border-gray-200/80 flex flex-col items-center justify-center relative group">
                  {activeAccount?.qr ? (
                    <img
                      src={activeAccount.qr.startsWith('http') ? activeAccount.qr : `${BASE_URL}${activeAccount.qr}`}
                      alt={`${method.toUpperCase()} QR Code`}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    /* Stylized SVG QR Code representation with Brand Badge */
                    <div className="w-full h-full bg-slate-900 rounded-xl p-2.5 flex flex-col items-center justify-between text-white relative overflow-hidden">
                      <div className="w-full flex justify-between items-center">
                        <div className="w-5 h-5 border-2 border-white rounded-xs p-0.5">
                          <div className="w-full h-full bg-white"></div>
                        </div>
                        <div className="w-5 h-5 border-2 border-white rounded-xs p-0.5">
                          <div className="w-full h-full bg-white"></div>
                        </div>
                      </div>

                      {/* Center Brand Pill */}
                      <div
                        className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider shadow ${
                          method === 'gcash' ? 'bg-[#007DFE] text-white' : 'bg-[#00D664] text-slate-900'
                        }`}
                      >
                        {method === 'gcash' ? 'GCash' : 'Maya'}
                      </div>

                      <div className="w-full flex justify-between items-end">
                        <div className="w-5 h-5 border-2 border-white rounded-xs p-0.5">
                          <div className="w-full h-full bg-white"></div>
                        </div>
                        <div className="text-[8px] font-mono opacity-80 uppercase tracking-tighter">SCAN TO PAY</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Details & One-Click Copy */}
                <div className="mt-3.5 bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-gray-200/60 shadow-2xs text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Account Name</p>
                      <p className="text-xs font-bold text-gray-900">{activeAccount?.name || 'RentAway Escrow'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-gray-400">Amount</p>
                      <p className="text-sm font-extrabold text-navy-700">₱{totalAmount.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Mobile Number</p>
                      <p className="font-mono text-sm font-bold text-gray-900">{activeAccount?.number || '0917-888-7692'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeAccount?.number)}
                      className="flex items-center gap-1 text-xs font-bold text-navy-700 hover:text-navy-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition"
                    >
                      {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedNumber ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  How to pay with real money:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1 text-amber-800/90 text-[11.5px]">
                  <li>Send exact <strong>₱{totalAmount.toLocaleString()}</strong> to the {method.toUpperCase()} number above.</li>
                  <li>Copy your <strong>Reference Number / Transaction ID</strong> from {method.toUpperCase()}.</li>
                  <li>Upload or attach the confirmation receipt screenshot below.</li>
                </ol>
              </div>

              {/* Payment Proof Form */}
              <form onSubmit={handleSubmitProof} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    {method.toUpperCase()} Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder={method === 'gcash' ? 'e.g. 9012 3456 7890 (or 13 digits)' : 'e.g. 1029384756'}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono font-medium focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Found in your SMS receipt or {method.toUpperCase()} transaction details.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Sender Account Name <span className="text-gray-400 text-[10px]">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:border-[#1e3a8a] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Sender Mobile Number <span className="text-gray-400 text-[10px]">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="e.g. 0917-xxx-xxxx"
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:border-[#1e3a8a] outline-none"
                    />
                  </div>
                </div>

                {/* Upload Receipt Screenshot */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Receipt Screenshot Proof
                  </label>

                  {receiptPreview ? (
                    <div className="relative rounded-xl border border-gray-200 p-2 flex items-center gap-3 bg-gray-50">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{receiptFile?.name}</p>
                        <p className="text-[10px] text-gray-400">{(receiptFile?.size / 1024).toFixed(1)} KB</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-0.5">
                          <Check className="w-3 h-3" /> Image attached
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 hover:border-[#1e3a8a] hover:bg-blue-50/40 rounded-xl p-4 text-center cursor-pointer transition"
                    >
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-gray-700">Click to upload screenshot</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">PNG, JPG, or WEBP up to 10MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !transactionRef.trim()}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {loading ? 'Submitting Proof...' : `Submit ${method.toUpperCase()} Proof & Confirm Rental`}
                </button>
              </form>
            </div>
          )}

          {/* Bank Transfer */}
          {method === 'bank' && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="font-bold text-gray-900 text-sm">BDO Unibank (Roxas Branch)</span>
                  <span className="font-extrabold text-navy-700">₱{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Name:</span>
                  <span className="font-semibold text-gray-800">RentAway Escrow Roxas</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Account Number:</span>
                  <span className="font-mono font-bold text-gray-900">002-345-678-9</span>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="font-bold text-gray-900 text-sm">Landbank of the Philippines</span>
                  <span className="font-extrabold text-navy-700">₱{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Name:</span>
                  <span className="font-semibold text-gray-800">RentAway Escrow Roxas</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Account Number:</span>
                  <span className="font-mono font-bold text-gray-900">1821-0092-44</span>
                </div>
              </div>

              {/* Reference form for Bank */}
              <form onSubmit={handleSubmitProof} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Bank Deposit / Transfer Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Enter deposit slip or online bank transfer ref no."
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono focus:border-[#1e3a8a] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Deposit Slip / Screenshot
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 hover:border-[#1e3a8a] rounded-xl p-3 text-center cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-gray-700">
                      {receiptFile ? receiptFile.name : 'Click to attach deposit receipt'}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !transactionRef.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-navy-700 hover:bg-navy-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {loading ? 'Submitting...' : 'Submit Bank Deposit Proof'}
                </button>
              </form>
            </div>
          )}

          {/* Card / Gateway via PayMongo */}
          {method === 'card' && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-navy-800 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Automated Gateway Checkout
                </div>
                <p className="text-blue-800/80 text-[11.5px]">
                  Pay immediately using Visa, Mastercard, or authorized online channels. Your payment will be
                  automatically verified upon completion.
                </p>
              </div>

              <button
                disabled={loading}
                onClick={handlePayMongo}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Pay via PayMongo Gateway (₱{totalAmount.toLocaleString()})
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-gray-400">Or Test Checkout</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button
                disabled={loading}
                onClick={handleDirectConfirm}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Processing...' : 'Direct Sandbox / Card Confirmation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}