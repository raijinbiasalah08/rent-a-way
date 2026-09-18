import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, roleDashboard } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(roleDashboard(user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">

      {/* ══ LEFT PANEL — dark navy ══════════════════════════════ */}
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

      {/* ══ RIGHT PANEL — cream form ════════════════════════════ */}
      <div className="flex-1 bg-[#f5f0e8] flex flex-col">
        {/* Back to site */}
        <div className="flex justify-end p-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to site
          </Link>
        </div>

        {/* Form centred vertically */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-12">
          <div className="w-full max-w-md">

            {/* Heading */}
            <div className="mb-8">
              <div className="text-amber-600 text-[10px] font-bold tracking-widest uppercase mb-2">
                Welcome back
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Sign in to Rent-A-Way</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Pick up where you left off —{' '}
                <span className="text-[#1e3a8a]">manage your rentals, listings and requests.</span>
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

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

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
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

              {/* Keep signed in + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setKeepSignedIn(v => !v)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                      keepSignedIn ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'border-gray-300'
                    }`}
                  >
                    {keepSignedIn && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-[#1e3a8a] font-medium">Keep me signed in</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-gray-800 transition">
                  Forgot password?
                </Link>
              </div>

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
                    Signing in…
                  </span>
                ) : (
                  <>Sign in <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Register link */}
            <p className="text-center text-sm text-gray-500 mt-6">
              New to Rent-A-Way?{' '}
              <Link to="/register" className="text-[#1e3a8a] font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}