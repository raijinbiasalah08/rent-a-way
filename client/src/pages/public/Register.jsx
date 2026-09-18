import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  Check, User, Phone, MapPin, ShoppingBag, Tag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register, roleDashboard } = useAuth();

  const [role, setRole] = useState('renter'); // 'renter' | 'supplier'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const mappedRole = role === 'renter' ? 'customer' : role;
      const user = await register({ name: fullName, email, phone: mobile, address: location, password, role: mappedRole });
      navigate(roleDashboard(user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">

      {/* ══ LEFT PANEL ═════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0f1729] flex-col p-10 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#1a2744] opacity-50" />
        <div className="absolute bottom-20 -left-16 w-56 h-56 rounded-full bg-[#1a2744] opacity-40" />
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full bg-[#1a2744] opacity-30" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-full bg-[#1e3a8a] border-2 border-amber-400 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-extrabold text-xs tracking-tight">RW</span>
          </div>
          <div>
            <div className="text-white font-extrabold text-sm leading-none">Rent-A-Way</div>
            <div className="text-amber-400 text-[9px] font-bold tracking-widest uppercase">Find better ways to save</div>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative">
          <div className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">
            Welcome to the marketplace
          </div>
          <h2 className="text-white text-5xl font-extrabold leading-tight mb-10">
            Rent what you need,<br />when you need it.
          </h2>
          <div className="space-y-5">
            {[
              'Rent cameras, camping, sports & event gear',
              'Verified local suppliers, transparent pricing',
              'One account for renting and listing',
            ].map((text) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-[#0f1729]" strokeWidth={3} />
                </div>
                <span className="text-gray-300 text-base leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL ════════════════════════════════════════ */}
      <div className="flex-1 bg-[#f5f0e8] flex flex-col">
        {/* Back to site */}
        <div className="flex justify-end p-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition">
            <ArrowLeft className="w-4 h-4" /> Back to site
          </Link>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 flex items-start justify-center px-4 sm:px-8 pb-12 overflow-y-auto">
          <div className="w-full max-w-md">

            {/* Heading */}
            <div className="mb-6">
              <div className="text-amber-600 text-[10px] font-bold tracking-widest uppercase mb-2">Get started</div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Create your account</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                One account to <span className="text-[#1e3a8a]">rent gear</span> or{' '}
                <span className="text-[#1e3a8a]">earn by listing</span> your own. It takes less than a minute.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Role toggle */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">I'm joining as</div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Renter */}
                  <button
                    type="button"
                    onClick={() => setRole('renter')}
                    className={`relative flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition ${
                      role === 'renter'
                        ? 'border-[#1e3a8a] bg-[#1e3a8a]/5'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      role === 'renter' ? 'bg-[#1e3a8a]' : 'bg-gray-100'
                    }`}>
                      <ShoppingBag className={`w-4 h-4 ${role === 'renter' ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold ${role === 'renter' ? 'text-[#1e3a8a]' : 'text-gray-700'}`}>
                          I want to rent
                        </span>
                        {role === 'renter' && (
                          <span className="w-2 h-2 rounded-full bg-[#1e3a8a] flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 leading-snug mt-0.5">
                        Browse and book gear from local suppliers
                      </div>
                    </div>
                  </button>

                  {/* Supplier */}
                  <button
                    type="button"
                    onClick={() => setRole('supplier')}
                    className={`relative flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition ${
                      role === 'supplier'
                        ? 'border-[#1e3a8a] bg-[#1e3a8a]/5'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      role === 'supplier' ? 'bg-[#1e3a8a]' : 'bg-gray-100'
                    }`}>
                      <Tag className={`w-4 h-4 ${role === 'supplier' ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold ${role === 'supplier' ? 'text-[#1e3a8a]' : 'text-gray-700'}`}>
                          I want to list
                        </span>
                        {role === 'supplier' && (
                          <span className="w-2 h-2 rounded-full bg-[#1e3a8a] flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 leading-snug mt-0.5">
                        Earn by renting out your own equipment
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Full name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition"
                  />
                </div>
              </div>

              {/* Mobile + Location side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mobile <span className="text-[#1e3a8a] font-normal text-xs">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={e => setMobile(e.target.value)}
                      placeholder="+63 917 000 0000"
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Location <span className="text-[#1e3a8a] font-normal text-xs">(optional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Quezon City"
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-11 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-11 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm && (
                  <p className={`text-xs mt-1.5 ${password === confirm ? 'text-green-600' : 'text-red-500'}`}>
                    {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Terms note */}
              <p className="text-xs text-gray-400 leading-relaxed">
                By creating an account you agree to our{' '}
                <Link to="/terms" className="text-[#1e3a8a] hover:underline">Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-[#1e3a8a] hover:underline">Privacy Policy</Link>.
              </p>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 rounded-xl transition"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating account…
                  </span>
                ) : (
                  <>Create account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Sign in link */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1e3a8a] font-semibold hover:underline">
                Sign in
              </Link>
            </p>

          </div>
        </div>
      </div>

    </div>
  );
}