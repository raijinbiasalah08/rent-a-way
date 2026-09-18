import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, ChevronDown, Search, User, Camera, Mountain, Bike, Calendar, Wrench, BookOpen } from 'lucide-react';
import { useState } from 'react';

const CATEGORIES = [
  { label: 'Cameras & Drones',       items: 128, to: '/browse?category=Cameras',   icon: Camera,    bg: 'bg-teal-50',   iconColor: 'text-teal-600' },
  { label: 'Camping Equipment',       items: 96,  to: '/browse?category=Camping',   icon: Mountain,  bg: 'bg-green-50',  iconColor: 'text-green-600' },
  { label: 'Sports Equipment',        items: 74,  to: '/browse?category=Sports',    icon: Bike,      bg: 'bg-orange-50', iconColor: 'text-orange-600' },
  { label: 'Event Equipment',         items: 63,  to: '/browse?category=Event',     icon: Calendar,  bg: 'bg-purple-50', iconColor: 'text-purple-600' },
  { label: 'Household Equipment',     items: 87,  to: '/browse?category=Household', icon: Wrench,    bg: 'bg-blue-50',   iconColor: 'text-blue-600' },
  { label: 'School Project Equipment',items: 52,  to: '/browse?category=School',    icon: BookOpen,  bg: 'bg-amber-50',  iconColor: 'text-amber-600' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
    setIsOpen(false);
  };

  return (
    <nav className="bg-[#0f1729] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-full border-2 border-amber-400 bg-[#1a2744] flex items-center justify-center">
              <span className="text-amber-400 font-black text-xs leading-none">RW</span>
            </div>
            <div className="leading-none">
              <div className="font-bold text-white text-base tracking-tight">Rent-A-Way</div>
              <div className="text-[9px] text-gray-400 tracking-widest uppercase">Find Better Ways to Save</div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/"
              className={`hover:text-white transition ${pathname === '/' ? 'text-white' : 'text-gray-300'}`}
            >
              Home
            </Link>

            {/* ── Categories Mega-Dropdown ── */}
            <div
              className="relative"
              onMouseEnter={() => setCatOpen(true)}
              onMouseLeave={() => setCatOpen(false)}
            >
              <button
                className={`flex items-center gap-1 transition ${catOpen ? 'text-white' : 'text-gray-300 hover:text-white'}`}
              >
                Categories
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`} />
              </button>

              {catOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[480px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-4 px-4 z-50">
                  {/* Arrow pointer */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-100 rotate-45" />

                  <div className="grid grid-cols-2 gap-1">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <Link
                          key={cat.to}
                          to={cat.to}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition group"
                          onClick={() => setCatOpen(false)}
                        >
                          {/* Icon box */}
                          <div className={`w-9 h-9 rounded-lg ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${cat.iconColor}`} />
                          </div>
                          {/* Text */}
                          <div>
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-[#1e3a8a] leading-tight">
                              {cat.label}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">{cat.items} items</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => scrollToSection('how-it-works')} className="text-gray-300 hover:text-white transition">How It Works</button>
            <Link to="/for-suppliers" className="text-gray-300 hover:text-white transition">For Suppliers</Link>
            <Link to="/community" className="text-gray-300 hover:text-white transition">Community</Link>

            {user && (
              <button onClick={logout} className="text-gray-300 hover:text-white transition">Logout</button>
            )}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 border border-gray-500 text-gray-200 hover:border-white hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  <User className="w-4 h-4" /> Sign in
                </Link>
                <Link
                  to="/browse"
                  className="flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  <Search className="w-4 h-4" /> Browse Equipment
                </Link>
              </>
            ) : (
              <Link
                to="/browse"
                className="flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                <Search className="w-4 h-4" /> Browse Equipment
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden text-gray-300 hover:text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#0f1729] border-t border-gray-700 px-4 py-4 space-y-2">
          <Link to="/" className="block text-gray-300 hover:text-white py-2 text-sm" onClick={() => setIsOpen(false)}>Home</Link>

          <div>
            <button
              className="flex items-center gap-1 text-gray-300 hover:text-white text-sm py-2 w-full"
              onClick={() => setCatOpen(!catOpen)}
            >
              Categories <ChevronDown className={`w-3.5 h-3.5 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
            </button>
            {catOpen && (
              <div className="mt-1 grid grid-cols-1 gap-1 pl-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <Link
                      key={cat.to}
                      to={cat.to}
                      className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-[#1a2744] transition"
                      onClick={() => { setCatOpen(false); setIsOpen(false); }}
                    >
                      <div className={`w-7 h-7 rounded-lg ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${cat.iconColor}`} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-200">{cat.label}</div>
                        <div className="text-[10px] text-gray-500">{cat.items} items</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={() => scrollToSection('how-it-works')} className="block text-gray-300 hover:text-white py-2 text-sm w-full text-left">How It Works</button>
          <Link to="/for-suppliers" className="block text-gray-300 hover:text-white py-2 text-sm" onClick={() => setIsOpen(false)}>For Suppliers</Link>
          <Link to="/community" className="block text-gray-300 hover:text-white py-2 text-sm" onClick={() => setIsOpen(false)}>Community</Link>

          {!user ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-700 mt-2">
              <Link to="/login" className="text-center border border-gray-500 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg" onClick={() => setIsOpen(false)}>Sign in</Link>
              <Link to="/browse" className="text-center bg-[#1e3a8a] text-white text-sm font-semibold px-4 py-2 rounded-lg" onClick={() => setIsOpen(false)}>Browse Equipment</Link>
            </div>
          ) : (
            <button onClick={() => { logout(); setIsOpen(false); }} className="block text-gray-300 hover:text-white py-2 text-sm w-full text-left border-t border-gray-700 mt-2 pt-3">Logout</button>
          )}
        </div>
      )}
    </nav>
  );
}