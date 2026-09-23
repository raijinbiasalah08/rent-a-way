import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check, User, Phone, ShoppingBag, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterRenter() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: fullName,
        email,
        phone: mobile,
        password,
        role: 'customer' // mapped to renter in Rent-A-Way backend and saved permanently in Firestore as renter
      });
      toast.success('Renter account registered successfully!');
      navigate('/renter', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* ══ LEFT PANEL — dark navy ══════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#0f1729] flex-col p-10 relative overflow-hidden justify-between">
        {/* Decorative background glows */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#1a2744] opacity-50" />
        <div className="absolute bottom-20 -left-16 w-56 h-56 rounded-full bg-[#1a2744] opacity-40" />

        {/* Logo & Header */}
        <div className="relative">
          <Link to="/" className="flex items-center gap-3 mb-12 group">
            <img
              src="/logo.png"
              alt="Rent-A-Way Logo"
              className="w-12 h-12 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="text-white font-extrabold text-base leading-none">Rent-A-Way</div>
              <div className="text-amber-400 text-[9px] font-bold tracking-widest uppercase">Find better ways to save</div>
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e3a8a]/40 border border-[#1e3a8a] text-blue-300 text-xs font-semibold mb-5">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-400" /> Renter Registration
          </div>

          <h2 className="text-white text-4xl font-extrabold leading-tight mb-6">
            Rent what you need in Roxas — quickly and affordably.
          </h2>

          <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
            {[
              'Rent tools, electronics, event props, and camping gear on demand',
              'Connect directly with verified local suppliers in Roxas, Oriental Mindoro',
              'Accurate barangay GPS distances & upfront pricing',
              'Keep track of active rentals and manage bookings easily'
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-blue-400" strokeWidth={3} />
                </div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Supplier switch banner */}
        <div className="relative bg-[#1a2744]/60 border border-blue-900/40 rounded-2xl p-4 mt-8">
          <p className="text-xs text-gray-300">
            Own equipment and want to earn passive income instead?
          </p>
          <Link
            to="/register-supplier"
            className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-semibold hover:text-amber-300 mt-2 transition"
          >
            Register as a Supplier <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ══ RIGHT PANEL — cream form ════════════════════════════ */}
      <div className="flex-1 bg-[#f5f0e8] flex flex-col justify-between">
        {/* Top bar */}
        <div className="flex justify-between items-center p-4 sm:p-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to site
          </Link>
          <div className="text-xs sm:text-sm text-gray-500">
            Already registered?{' '}
            <Link to="/login" className="text-[#1e3a8a] font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-6">
          <div className="w-full max-w-md">
            <div className="mb-5">
              <div className="text-[#1e3a8a] text-[10px] font-bold tracking-widest uppercase mb-1">
                Renter Account
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">
                Create your Renter account
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Join Rent-A-Way to find and rent equipment anywhere in Roxas.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}


            {/* Email Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    placeholder="0912 345 6789"
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] disabled:opacity-60 text-white font-semibold text-xs sm:text-sm py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                {loading ? 'Creating account…' : <>Complete Renter Registration <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              Looking to list equipment instead?{' '}
              <Link to="/register-supplier" className="text-amber-700 font-semibold hover:underline">
                Register as Supplier
              </Link>
            </p>
          </div>
        </div>

        <div className="p-4 text-center text-xs text-gray-400 border-t border-gray-200/60">
          © Rent-A-Way Roxas, Oriental Mindoro. All rights reserved.
        </div>
      </div>
    </div>
  );
}
