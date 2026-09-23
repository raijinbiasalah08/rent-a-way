import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, roleDashboard } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.needRoleSelection) {
        // New user with no Firestore document: route to /choose-role
        navigate('/choose-role');
      } else {
        // Existing user: automatically redirect to saved role destination
        if (result.role === 'supplier') {
          navigate('/supplier');
        } else if (result.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/renter');
        }
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      const isApiKeyMissingOrInvalid = 
        err.code?.includes('api-key') || 
        err.message?.includes('api-key') || 
        err.code === 'auth/invalid-api-key' ||
        err.code === 'auth/configuration-not-found';

      if (isApiKeyMissingOrInvalid) {
        setError('To enable Google Sign-In, please add your Firebase project API key to client/.env (VITE_FIREBASE_API_KEY). You can sign in using your email & password above!');
      } else {
        setError(err.response?.data?.message || err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

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
        <Link to="/" className="relative flex items-center gap-3 mb-16 group">
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
        <div className="flex justify-end p-4 sm:p-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Back to site
          </Link>
        </div>

        {/* Form centred vertically */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-6 sm:pb-8">
          <div className="w-full max-w-md">

            {/* Heading */}
            <div className="mb-4">
              <div className="text-amber-600 text-[10px] font-bold tracking-widest uppercase mb-1.5">
                Welcome back
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1.5">Sign in to Rent-A-Way</h1>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Pick up where you left off —{' '}
                <span className="text-[#1e3a8a]">manage your rentals, listings and requests.</span>
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">

              {/* Email */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-11 py-2.5 text-xs sm:text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Keep signed in + Forgot */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setKeepSignedIn(v => !v)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${keepSignedIn ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'border-gray-300'
                      }`}
                  >
                    {keepSignedIn && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[#1e3a8a] font-medium">Keep me signed in</span>
                </label>
                <Link to="/forgot-password" className="text-gray-500 hover:text-gray-800 transition">
                  Forgot password?
                </Link>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm py-3 rounded-xl shadow-xs hover:shadow-md transition cursor-pointer"
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

            {/* Visual Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400 font-medium">or continue with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold text-xs sm:text-sm py-2.5 rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.41 7.36 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.29 2.59 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>{googleLoading ? 'Connecting Google…' : 'Continue with Google'}</span>
            </button>

            {/* Register link */}
            <p className="text-center text-xs sm:text-sm text-gray-500 mt-4">
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