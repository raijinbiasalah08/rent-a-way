import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Tag, ArrowRight, Check, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ChooseRole() {
  const navigate = useNavigate();
  const { user, pendingGoogleUser, assignRoleAndFinalize } = useAuth();

  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingRole, setSubmittingRole] = useState(null);
  const [error, setError] = useState('');

  // Protect /choose-role:
  // - Existing users who already have a role should NEVER see this page again.
  // - Unauthenticated users are redirected to /login.
  useEffect(() => {
    const guardRoleSelection = async () => {
      // 1. Check local session
      if (user && user.role) {
        if (user.role === 'supplier') {
          navigate('/supplier', { replace: true });
        } else {
          navigate('/renter', { replace: true });
        }
        return;
      }

      // 2. Check active Firebase auth user
      const currentAuthUser = auth.currentUser || pendingGoogleUser;
      if (!currentAuthUser) {
        navigate('/login', { replace: true });
        return;
      }

      // 3. Query Firestore users/{uid} to check if role is already permanently stored
      try {
        const userRef = doc(db, 'users', currentAuthUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data()?.role) {
          const savedRole = snap.data().role;
          if (savedRole === 'supplier') {
            navigate('/supplier', { replace: true });
          } else {
            navigate('/renter', { replace: true });
          }
          return;
        }
      } catch (err) {
        console.warn('Firestore verification error:', err);
      } finally {
        setChecking(false);
      }
    };

    guardRoleSelection();
  }, [user, pendingGoogleUser, navigate]);

  const activeAuthUser = auth.currentUser || pendingGoogleUser;

  const handleSelectRole = async (role) => {
    setError('');
    setSubmitting(true);
    setSubmittingRole(role);
    try {
      // Saves displayName, email, photoURL, role, and createdAt in Firestore,
      // syncs backend session, and redirects to designated page
      await assignRoleAndFinalize(role);
      toast.success(`Account created as ${role === 'supplier' ? 'Supplier' : 'Renter'}!`);
      
      if (role === 'supplier') {
        navigate('/supplier', { replace: true });
      } else {
        navigate('/renter', { replace: true });
      }
    } catch (err) {
      console.error('Error assigning role:', err);
      setError(err.message || 'Could not save your role. Please try again.');
      setSubmitting(false);
      setSubmittingRole(null);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-9 h-9 text-[#1e3a8a] animate-spin mb-3" />
        <p className="text-gray-600 text-sm font-medium">Verifying your account status…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col justify-between font-sans">
      {/* ══ TOP NAVBAR ══════════════════════════════════════════ */}
      <header className="px-6 py-5 border-b border-gray-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Rent-A-Way Logo"
            className="w-10 h-10 object-contain drop-shadow-sm"
          />
          <div>
            <div className="text-gray-900 font-extrabold text-sm leading-none">Rent-A-Way</div>
            <div className="text-amber-600 text-[9px] font-bold tracking-widest uppercase">Roxas, Oriental Mindoro</div>
          </div>
        </div>

        {activeAuthUser && (
          <div className="flex items-center gap-2.5 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full">
            {activeAuthUser.photoURL ? (
              <img
                src={activeAuthUser.photoURL}
                alt={activeAuthUser.displayName || 'User'}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#1e3a8a] text-white text-[10px] font-bold flex items-center justify-center">
                {(activeAuthUser.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <span className="text-xs text-gray-700 font-medium hidden sm:inline max-w-[180px] truncate">
              {activeAuthUser.email}
            </span>
          </div>
        )}
      </header>

      {/* ══ MAIN SELECTION SECTION ══════════════════════════════ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col justify-center">
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-semibold mb-3.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> One-Time Setup
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2.5">
            How do you want to use Rent-A-Way?
          </h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Select your primary role. This determines your dashboard and features. You will only need to choose this once.
          </p>
        </div>

        {error && (
          <div className="mb-6 max-w-lg mx-auto bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm px-4 py-3 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ══ ROLE CARDS GRID ════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          {/* Card 1: RENTER */}
          <div
            onClick={() => !submitting && handleSelectRole('renter')}
            className={`relative group bg-white border-2 rounded-2xl p-6 sm:p-7 transition-all duration-200 flex flex-col justify-between cursor-pointer ${
              submittingRole === 'renter'
                ? 'border-[#1e3a8a] ring-4 ring-[#1e3a8a]/10 shadow-lg'
                : 'border-gray-200 hover:border-[#1e3a8a] hover:shadow-xl hover:-translate-y-1'
            } ${submitting && submittingRole !== 'renter' ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors duration-200 shadow-2xs">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-50 text-[#1e3a8a] border border-blue-200">
                  Renter
                </span>
              </div>

              <h2 className="text-xl font-extrabold text-gray-900 mb-2 group-hover:text-[#1e3a8a] transition">
                I want to rent equipment
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                Browse cameras, construction tools, sound systems, event equipment, and party gear from verified local suppliers in Roxas.
              </p>

              <div className="space-y-2.5 mb-6 pt-4 border-t border-gray-100 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#1e3a8a]" strokeWidth={3} />
                  </div>
                  <span>Instant access to tools without buying</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#1e3a8a]" strokeWidth={3} />
                  </div>
                  <span>Distance readouts from Roxas barangays</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#1e3a8a]" strokeWidth={3} />
                  </div>
                  <span>Transparent rates and verified owners</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] group-hover:bg-[#1d4ed8] text-white font-semibold text-xs sm:text-sm py-3 rounded-xl transition shadow-xs cursor-pointer"
            >
              {submittingRole === 'renter' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Renter role…
                </span>
              ) : (
                <>Continue as Renter <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" /></>
              )}
            </button>
          </div>

          {/* Card 2: SUPPLIER */}
          <div
            onClick={() => !submitting && handleSelectRole('supplier')}
            className={`relative group bg-white border-2 rounded-2xl p-6 sm:p-7 transition-all duration-200 flex flex-col justify-between cursor-pointer ${
              submittingRole === 'supplier'
                ? 'border-amber-500 ring-4 ring-amber-500/10 shadow-lg'
                : 'border-gray-200 hover:border-amber-500 hover:shadow-xl hover:-translate-y-1'
            } ${submitting && submittingRole !== 'supplier' ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors duration-200 shadow-2xs">
                  <Tag className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200">
                  Supplier
                </span>
              </div>

              <h2 className="text-xl font-extrabold text-gray-900 mb-2 group-hover:text-amber-700 transition">
                I want to list equipment
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                Turn your idle tools, machinery, electronics, and rental gear into passive income by listing them for renters in Roxas.
              </p>

              <div className="space-y-2.5 mb-6 pt-4 border-t border-gray-100 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-amber-700" strokeWidth={3} />
                  </div>
                  <span>Set your own daily rental prices</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-amber-700" strokeWidth={3} />
                  </div>
                  <span>Accurate Roxas barangay pickup pin</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-amber-700" strokeWidth={3} />
                  </div>
                  <span>Manage rental bookings and payouts</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-amber-600 group-hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm py-3 rounded-xl transition shadow-xs cursor-pointer"
            >
              {submittingRole === 'supplier' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Supplier role…
                </span>
              ) : (
                <>Continue as Supplier <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" /></>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* ══ FOOTER ═════════════════════════════════════════════ */}
      <footer className="p-4 text-center text-xs text-gray-400 border-t border-gray-200/60">
        © Rent-A-Way Roxas, Oriental Mindoro. All rights reserved.
      </footer>
    </div>
  );
}
