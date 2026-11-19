import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signInDestination } from "../../utils/session";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getGoogleConfig } from "../../api/auth";
import GoogleSignInButton from "../../components/GoogleSignInButton";

export default function Login() {
  const navigate = useNavigate();
  const { state } = useLocation();
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [capsLock, setCapsLock] = useState(false);
  const [configAttempt, setConfigAttempt] = useState(0);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const errorRef = useRef(null);
  const submittingRef = useRef(false);
  const busy = loading || googleLoading;

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const retryGoogleConfig = () => {
    setGoogleConfigLoading(true);
    setGoogleConfigError("");
    setConfigAttempt((attempt) => attempt + 1);
  };

  useEffect(() => {
    let active = true;

    getGoogleConfig()
      .then((res) => {
        if (active) setGoogleClientId(res.data.data.clientId || "");
      })
      .catch(() => {
        if (active) {
          setGoogleConfigError(
            "Google sign-in is temporarily unavailable. You can still use your email and password.",
          );
        }
      })
      .finally(() => {
        if (active) setGoogleConfigLoading(false);
      });

    return () => {
      active = false;
    };
  }, [configAttempt]);

  const handleGoogleCredential = async (credential) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle(credential);
      if (result.needRoleSelection) {
        navigate("/choose-role", { state, replace: true });
      } else {
        navigate(signInDestination(state, roleDashboard(result.role)), {
          replace: true,
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Google sign-in failed. Please try again.",
      );
    } finally {
      submittingRef.current = false;
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError("");
    const cleanEmail = email.trim();
    const errors = {};
    if (!cleanEmail) errors.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      errors.email = "Enter a valid email address, like you@example.com.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setEmail(cleanEmail);
    submittingRef.current = true;
    setLoading(true);
    try {
      const user = await login(cleanEmail, password, keepSignedIn);
      navigate(signInDestination(state, roleDashboard(user.role)), {
        replace: true,
      });
    } catch (err) {
      setError(
        !err.response
          ? "We couldn’t connect. Check your internet connection and try again."
          : err.response.status === 429
            ? "Too many sign-in attempts. Please wait a moment and try again."
            : err.response.status >= 500
              ? "Sign-in is temporarily unavailable. Please try again shortly."
              : err.response?.data?.message ||
                "That email and password don’t match. Please try again.",
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-4rem)] min-w-0 font-sans">
      {/* ══ RIGHT PANEL — cream form ════════════════════════════ */}
      <div className="min-w-0 flex-1 bg-[#faf9f6] flex flex-col">
        {/* Form centred vertically */}
        <div className="flex min-w-0 flex-1 items-start justify-center px-4 py-6 sm:px-6 sm:py-8">
          <div className="w-full min-w-0 max-w-md rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
            {/* Heading */}
            <div className="mb-5">
              <div className="text-amber-700 text-[11px] font-bold tracking-[0.15em] uppercase mb-2">
                WELCOME BACK
              </div>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#0f1729] mb-2 sm:text-[28px]">
                Sign in to Rent-A-Way
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Sign in to pick up where you left off.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="mb-5 flex gap-2.5 break-words rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-relaxed text-red-800 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              aria-busy={busy}
              className="space-y-4"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-sm font-semibold text-slate-700 sm:mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={emailRef}
                    disabled={busy}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={
                      fieldErrors.email ? "login-email-error" : undefined
                    }
                    enterKeyHint="next"
                    id="login-email"
                    name="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    inputMode="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((current) => ({ ...current, email: "" }));
                      setError("");
                    }}
                    placeholder="you@example.com"
                    required
                    className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-4 text-base text-slate-900 placeholder-slate-400 outline-none transition disabled:opacity-70 aria-[invalid=true]:border-red-400 aria-[invalid=true]:bg-red-50/30 focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-700/10"
                  />
                </div>
                {fieldErrors.email && (
                  <p
                    id="login-email-error"
                    className="mt-2 text-xs leading-relaxed text-red-700"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-sm font-semibold text-slate-700 sm:mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={passwordRef}
                    disabled={busy}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={
                      fieldErrors.password
                        ? "login-password-error"
                        : capsLock
                          ? "login-caps-lock"
                          : undefined
                    }
                    enterKeyHint="go"
                    onKeyDown={(e) =>
                      setCapsLock(e.getModifierState("CapsLock"))
                    }
                    onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
                    id="login-password"
                    name="password"
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((current) => ({
                        ...current,
                        password: "",
                      }));
                      setError("");
                    }}
                    placeholder="Enter your password"
                    required
                    className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-12 text-base text-slate-900 placeholder-slate-400 outline-none transition disabled:opacity-70 aria-[invalid=true]:border-red-400 aria-[invalid=true]:bg-red-50/30 focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-700/10"
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
                {fieldErrors.password && (
                  <p
                    id="login-password-error"
                    className="mt-2 text-xs text-red-700"
                  >
                    {fieldErrors.password}
                  </p>
                )}
                {capsLock && (
                  <p
                    id="login-caps-lock"
                    role="status"
                    className="mt-2 text-xs text-amber-800"
                  >
                    Caps Lock is on.
                  </p>
                )}
              </div>

              {/* Keep signed in + Forgot */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs sm:text-sm">
                <label className="flex min-h-10 cursor-pointer items-center gap-2 text-slate-600 sm:min-h-11">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded accent-[#1e3a8a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  />
                  Keep me signed in
                </label>
                <Link
                  to="/forgot-password"
                  className="inline-flex min-h-10 items-center font-semibold text-[#1e3a8a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 sm:min-h-11"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-700/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />{" "}
                    {googleLoading ? "Signing in with Google…" : "Signing in…"}
                  </>
                ) : (
                  <>
                    Sign in{" "}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Visual Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400 font-medium">
                or continue with
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <p role="status" aria-live="polite" className="sr-only">
              {busy ? "Signing in. Please wait." : ""}
            </p>
            <GoogleSignInButton
              clientId={googleClientId}
              configLoading={googleConfigLoading}
              configError={googleConfigError}
              onRetryConfig={retryGoogleConfig}
              disabled={googleLoading || loading}
              onCredential={handleGoogleCredential}
            />

            {/* Register link */}
            <p className="mt-4 border-t border-slate-100 pt-4 text-center text-sm leading-7 text-slate-500">
              New to Rent-A-Way?{" "}
              <Link
                to="/register"
                className="inline-flex min-h-10 items-center rounded-md text-[#1e3a8a] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 sm:min-h-11"
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
