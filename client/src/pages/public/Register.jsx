import { Link } from 'react-router-dom';
import { ShoppingBag, Tag, ArrowRight, ArrowLeft, Check, ShieldCheck, MapPin } from 'lucide-react';

export default function Register() {
  return (
    <div className="min-h-screen flex font-sans">
      {/* ══ LEFT PANEL — dark navy ══════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#0f1729] flex-col p-10 relative overflow-hidden justify-between">
        {/* Decorative background glows */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#1a2744] opacity-50" />
        <div className="absolute bottom-20 -left-16 w-56 h-56 rounded-full bg-[#1a2744] opacity-40" />

        {/* Logo & Brand */}
        <div className="relative">
          <Link to="/" className="flex items-center gap-3 mb-12 group">
            <img
              src="/logo.png"
              alt="Rent-A-Way Logo"
              className="w-12 h-12 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="text-white font-extrabold text-base leading-none">Rent-A-Way</div>
              <div className="text-amber-400 text-[9px] font-bold tracking-widest uppercase">
                Find better ways to save
              </div>
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Dedicated Registration
          </div>

          <h2 className="text-white text-4xl font-extrabold leading-tight mb-6">
            Join Rent-A-Way in Roxas, Oriental Mindoro.
          </h2>

          <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
            {[
              'Dedicated portals for Renters and verified Equipment Suppliers',
              'Permanent role registration: you only need to choose once',
              'Fast access to 20 Roxas barangays with precise GPS mapping',
              'Quick and secure direct account registration'
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

        {/* Location badge */}
        <div className="relative flex items-center gap-2 text-xs text-amber-400/90 bg-[#1a2744]/60 border border-blue-900/40 rounded-xl p-3">
          <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Restricted exclusively to Roxas, Oriental Mindoro, Philippines</span>
        </div>
      </div>

      {/* ══ RIGHT PANEL — cream choice page ══════════════════════ */}
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
            Already have an account?{' '}
            <Link to="/login" className="text-[#1e3a8a] font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        {/* Main Content: Choose Registration Role */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8">
          <div className="w-full max-w-xl">
            <div className="text-center mb-8">
              <div className="text-amber-700 text-[10px] font-bold tracking-widest uppercase mb-1.5">
                Create an Account
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
                Choose your registration type
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                Users register through separate dedicated pages. Your role is permanently saved so you never need to choose again.
              </p>
            </div>

            {/* Separate Registration Cards */}
            <div className="space-y-4">
              {/* Card 1: RENTER */}
              <Link
                to="/register-renter"
                className="group block bg-white border-2 border-gray-200/90 hover:border-[#1e3a8a] rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1e3a8a] group-hover:bg-[#1e3a8a] group-hover:text-white flex items-center justify-center transition-colors duration-200 shadow-2xs">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1e3a8a] border border-blue-200 mb-1 inline-block">
                        Renter
                      </span>
                      <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 group-hover:text-[#1e3a8a] transition">
                        Register as a Renter
                      </h2>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-[#1e3a8a] group-hover:text-white text-gray-400 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-[62px]">
                  Browse, compare, and rent equipment, power tools, cameras, camping gear, and event supplies across Roxas.
                </p>
              </Link>

              {/* Card 2: SUPPLIER */}
              <Link
                to="/register-supplier"
                className="group block bg-white border-2 border-gray-200/90 hover:border-amber-500 rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition-colors duration-200 shadow-2xs">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 mb-1 inline-block">
                        Supplier / Lister
                      </span>
                      <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 group-hover:text-amber-700 transition">
                        Register as a Supplier
                      </h2>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-amber-500 group-hover:text-white text-gray-400 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-[62px]">
                  List your tools, vehicles, and equipment with exact Roxas barangay location to earn steady passive rental income.
                </p>
              </Link>
            </div>

            <div className="mt-8 text-center text-xs text-gray-500">
              Need help? Contact support or learn more about{' '}
              <Link to="/for-suppliers" className="text-[#1e3a8a] font-semibold hover:underline">
                how Rent-A-Way works
              </Link>.
            </div>
          </div>
        </div>

        <div className="p-4 text-center text-xs text-gray-400 border-t border-gray-200/60">
          © Rent-A-Way Roxas, Oriental Mindoro. All rights reserved.
        </div>
      </div>
    </div>
  );
}