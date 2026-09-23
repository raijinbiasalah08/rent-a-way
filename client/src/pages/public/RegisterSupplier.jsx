import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  Check, User, Phone, MapPin, Tag, LocateFixed, Loader2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LocationPicker from '../../components/LocationPicker';
import { isWithinRoxas, ROXAS_BARANGAYS, formatRoxasAddress } from '../../utils/roxasLocation';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function RegisterSupplier() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [barangay, setBarangay] = useState('San Aquilino');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [location, setLocation] = useState('Brgy. San Aquilino, Roxas, Oriental Mindoro');
  const [coords, setCoords] = useState([12.5967, 121.4841]); // San Aquilino center
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser');
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setCoords([lat, lng]);
        setDetectingLocation(false);
        toast.success('GPS coordinates detected!');
        try {
          const res = await api.get('/products/geocode/reverse', {
            params: { lat, lng }
          });
          if (res.data?.data?.display_name) {
            setLocation(res.data.data.display_name);
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
        }
      },
      (err) => {
        setDetectingLocation(false);
        console.warn('Geolocation error:', err);
        toast.error('Unable to retrieve your location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

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
    if (!barangay) {
      setError('Please select an official Barangay in Roxas, Oriental Mindoro.');
      return;
    }
    if (!coords || !coords[0] || !coords[1] || !isWithinRoxas(coords[0], coords[1])) {
      setError('Only locations within Roxas, Oriental Mindoro are allowed.');
      return;
    }

    setLoading(true);
    try {
      const fullAddress = location?.trim() || formatRoxasAddress(barangay, street, landmark);
      await register({
        name: fullName,
        email,
        phone: mobile,
        barangay,
        address: fullAddress,
        latitude: coords ? coords[0] : null,
        longitude: coords ? coords[1] : null,
        password,
        role: 'supplier'
      });
      toast.success('Supplier account registered successfully!');
      navigate('/supplier', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create supplier account. Please try again.');
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

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold mb-5">
            <Tag className="w-3.5 h-3.5 text-amber-400" /> Supplier Registration
          </div>

          <h2 className="text-white text-4xl font-extrabold leading-tight mb-6">
            Turn your idle equipment into steady income in Roxas.
          </h2>

          <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
            {[
              'List tools, event equipment, party rentals, vehicles & machinery',
              'Set your own rates per day and specify your exact Roxas Barangay pickup spot',
              'Direct GPS mapping ensures nearby renters find your listings first',
              'Manage rental requests, track bookings, and confirm payouts directly'
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-amber-400" strokeWidth={3} />
                </div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Renter switch banner */}
        <div className="relative bg-[#1a2744]/60 border border-amber-500/30 rounded-2xl p-4 mt-8">
          <p className="text-xs text-gray-300">
            Looking to rent items instead of listing them?
          </p>
          <Link
            to="/register-renter"
            className="inline-flex items-center gap-1.5 text-blue-300 text-xs font-semibold hover:text-white mt-2 transition"
          >
            Register as a Renter <ArrowRight className="w-3.5 h-3.5" />
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
          <div className="w-full max-w-lg">
            <div className="mb-5">
              <div className="text-amber-700 text-[10px] font-bold tracking-widest uppercase mb-1">
                Supplier Account
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">
                Create your Supplier account
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Register as a verified equipment supplier in Roxas, Oriental Mindoro.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}


            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name / Business</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Roxas Tools & Rentals"
                      required
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Mobile</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={e => setMobile(e.target.value)}
                      placeholder="0917 123 4567"
                      required
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/10"
                    />
                  </div>
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
                    placeholder="supplier@example.com"
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/10"
                  />
                </div>
              </div>

              {/* Barangay Selector */}
              <div className="bg-white border border-amber-200/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    Roxas Barangay (Required)
                  </label>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Roxas, Oriental Mindoro Only
                  </span>
                </div>
                <select
                  value={barangay}
                  onChange={(e) => {
                    const newBrgy = e.target.value;
                    setBarangay(newBrgy);
                    const brgyObj = ROXAS_BARANGAYS.find(b => b.name === newBrgy);
                    if (brgyObj) {
                      setCoords([brgyObj.lat, brgyObj.lng]);
                    }
                    setLocation(formatRoxasAddress(newBrgy, street, landmark));
                  }}
                  className="w-full bg-amber-50/40 border border-amber-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-800 font-medium outline-none focus:border-amber-600 mb-3"
                >
                  {ROXAS_BARANGAYS.map((b) => (
                    <option key={b.name} value={b.name}>Brgy. {b.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Street / Purok / Sitio</label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => {
                        setStreet(e.target.value);
                        setLocation(formatRoxasAddress(barangay, e.target.value, landmark));
                      }}
                      placeholder="e.g. Purok 3, Rizal St."
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 outline-none focus:border-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Landmark (Optional)</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => {
                        setLandmark(e.target.value);
                        setLocation(formatRoxasAddress(barangay, street, e.target.value));
                      }}
                      placeholder="Near Barangay Hall"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

                {/* Location Map Picker */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-gray-600 font-medium">Pin exact Roxas location:</span>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="inline-flex items-center gap-1 text-[11px] text-[#1e3a8a] hover:text-[#1d4ed8] font-semibold cursor-pointer"
                  >
                    {detectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
                    Use my GPS
                  </button>
                </div>
                <div className="h-44 rounded-lg overflow-hidden border border-gray-200">
                  <LocationPicker
                    initialPosition={coords}
                    onPositionChange={(pos) => setCoords(pos)}
                    onAddressChange={(addr) => setLocation(addr)}
                  />
                </div>
              </div>

              {/* Password Fields */}
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
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/10"
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
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/10"
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
                className="w-full mt-2 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-semibold text-xs sm:text-sm py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                {loading ? 'Registering Supplier…' : <>Complete Supplier Registration <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              Want to rent items instead?{' '}
              <Link to="/register-renter" className="text-[#1e3a8a] font-semibold hover:underline">
                Register as Renter
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
