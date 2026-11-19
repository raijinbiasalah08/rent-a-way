import RegistrationIdentity from "../../components/RegistrationIdentity";
import RegistrationTerms, {
  TERMS_VERSION,
} from "../../components/RegistrationTerms";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Phone,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function RegisterRenter() {
  const [identityDocument, setIdentityDocument] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setLoading(true);
    try {
      await register({
        identityDocument,
        acceptedTermsVersion: acceptedTerms ? TERMS_VERSION : null,
        name: fullName,
        email,
        phone: mobile,
        password,
        role: "customer", // The backend stores renters as customers.
      });
      toast.success("Renter account registered successfully!");
      navigate("/renter", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-page flex font-sans">
      {/* ══ RIGHT PANEL — cream form ════════════════════════════ */}
      <div className="min-w-0 flex-1 bg-[#faf9f6] flex flex-col">
        {/* Top bar */}
        <div className="mx-auto flex w-full max-w-xl justify-end items-center px-5 pt-6">
          <div className="text-xs sm:text-sm text-gray-500">
            Already registered?{" "}
            <Link
              to="/login"
              className="text-[#1e3a8a] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="min-w-0 flex justify-center px-4 py-6 sm:pb-12">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
            <div className="mb-5">
              <div className="text-[#1e3a8a] text-[10px] font-bold tracking-widest uppercase mb-1">
                Renter Account
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">
                Create your account
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Find and rent equipment, vehicles, and apartments in Roxas.
              </p>
            </div>

            <nav
              aria-label="Account type"
              className="mb-6 grid grid-cols-2 gap-2"
            >
              <Link
                to="/register-renter"
                aria-current="page"
                className="rounded-lg border px-4 py-2.5 text-center text-sm font-semibold border-amber-300 bg-amber-100 text-slate-950"
              >
                Renter
              </Link>
              <Link
                to="/register-supplier"
                className="rounded-lg border px-4 py-2.5 text-center text-sm font-semibold border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Supplier
              </Link>
            </nav>
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
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="0912 345 6789"
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showConfirm ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <RegistrationIdentity onChange={setIdentityDocument} />
              <RegistrationTerms
                accepted={acceptedTerms}
                onChange={setAcceptedTerms}
              />

              <button
                type="submit"
                disabled={loading || !acceptedTerms || !identityDocument}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold text-xs sm:text-sm py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                {loading ? (
                  "Creating account…"
                ) : (
                  <>
                    Complete Renter Registration{" "}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              Looking to list rentals instead?{" "}
              <Link
                to="/register-supplier"
                className="text-amber-700 font-semibold hover:underline"
              >
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
