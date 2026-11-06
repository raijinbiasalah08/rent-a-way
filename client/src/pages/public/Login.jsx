import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getGoogleConfig } from "../../api/auth";
import GoogleSignInButton from "../../components/GoogleSignInButton";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, roleDashboard } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleConfigLoading, setGoogleConfigLoading] = useState(true);
  const [googleConfigError, setGoogleConfigError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getGoogleConfig()
      .then((res) => {
        if (active) setGoogleClientId(res.data.data.clientId || "");
      })
      .catch((err) => {
        if (active) {
          setGoogleConfigError(
            err.response?.data?.message ||
              "Google sign-in is unavailable while the API server is offline.",
          );
        }
      })
      .finally(() => {
        if (active) setGoogleConfigLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleGoogleCredential = async (credential) => {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle(credential);
      if (result.needRoleSelection) {
        navigate("/choose-role");
      } else {
        navigate(roleDashboard(result.role));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Google sign-in failed. Please try again.",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password, keepSignedIn);
      navigate(roleDashboard(user.role));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid email or password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-4rem)] min-w-0 font-sans">
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
            <div className="text-white font-extrabold text-base leading-none">
              Rent-A-Way
            </div>
            <div className="text-amber-400 text-[9px] font-bold tracking-widest uppercase">
              Find better ways to save
            </div>
          </div>
        </Link>

        {/* Hero copy */}
        <div className="relative">
          <div className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">
            Welcome to the marketplace
          </div>
          <h2 className="text-white text-5xl font-extrabold leading-tight mb-10">
            Rent what you need,
            <br />
            when you need it.
          </h2>
          <div className="space-y-5">
            {[
              "Rent cameras, camping, sports & event gear",
              "Verified local suppliers, transparent pricing",
              "One account for renting and listing",
            ].map((text) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check
                    className="w-3.5 h-3.5 text-[#0f1729]"
                    strokeWidth={3}
                  />
                </div>
                <span className="text-gray-300 text-base leading-snug">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — cream form ════════════════════════════ */}
      <div className="min-w-0 flex-1 bg-[#f5f0e8] flex flex-col">
        {/* Back to site */}
        <div className="mx-auto flex w-full max-w-xl justify-start px-5 pt-4 sm:px-8 sm:pt-6 lg:max-w-none lg:justify-end">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Back to site
          </Link>
        </div>

        {/* Form centred vertically */}
        <div className="flex min-w-0 flex-1 items-start justify-center px-4 pb-10 pt-4 sm:px-8 sm:pt-6 lg:items-center lg:pb-12">
          <div className="w-full min-w-0 max-w-md rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] sm:p-8">
            {/* Heading */}
            <div className="mb-6">
              <div className="text-amber-700 text-[11px] font-bold tracking-[0.15em] uppercase mb-2">
                Welcome back
              </div>
              <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#0f1729] mb-3 sm:text-3xl">
                Sign in to your account
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Your next rental starts here. Manage your bookings and listings
                in one place.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="mb-4 break-words bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-email"
                    name="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    inputMode="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="min-h-[52px] w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-4 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-700/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-password"
                    name="password"
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="min-h-[52px] w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-12 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-700/10"
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Keep signed in + Forgot */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs sm:text-sm">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded accent-[#1e3a8a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  />
                  Keep me signed in
                </label>
                <Link
                  to="/forgot-password"
                  className="inline-flex min-h-11 items-center font-semibold text-[#1e3a8a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-700/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  <>
                    Sign in <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Visual Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400 font-medium">
                or continue with
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <GoogleSignInButton
              clientId={googleClientId}
              configLoading={googleConfigLoading}
              configError={googleConfigError}
              disabled={googleLoading || loading}
              onCredential={handleGoogleCredential}
            />

            {/* Register link */}
            <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm leading-7 text-slate-500">
              New to Rent-A-Way?{" "}
              <Link
                to="/register"
                className="text-[#1e3a8a] font-semibold hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
