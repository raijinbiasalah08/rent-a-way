import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, ChevronDown, Search, User, Camera, Mountain, Bike, Calendar, Wrench, BookOpen, Bell, MessageCircle, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import { useSocket } from '../context/SocketContext';

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
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { socket } = useSocket();

  const fetchNotifications = () => {
    if (user) {
      getNotifications().then(res => {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }).catch(console.error);
    }
  };

  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      socket.on('new_notification', (notif) => {
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        socket.off('new_notification');
      };
    }
  }, [user, socket]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

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
            {!user && <Link to="/for-suppliers" className="text-gray-300 hover:text-white transition">For Suppliers</Link>}
            <Link to="/community" className="text-gray-300 hover:text-white transition">Community</Link>
            
            {installPrompt && (
              <button 
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
              >
                <Download className="w-3.5 h-3.5" /> Install App
              </button>
            )}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user && user.role === 'customer' && (
              <Link to="/customer/favorites" className="text-gray-300 hover:text-white transition p-2 relative" title="Favorites">
                <svg className="w-5 h-5 text-gray-300 hover:text-red-400 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </Link>
            )}

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
              <>
                <Link to="/messages" className="text-gray-300 hover:text-white transition p-2 relative">
                  <MessageCircle className="w-5 h-5" />
                </Link>
                
                <div className="relative">
                  <button 
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="text-gray-300 hover:text-white transition p-2 relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f1729]"></span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-bold text-gray-900">Notifications</span>
                        <button onClick={() => markAllNotificationsRead().then(fetchNotifications)} className="text-xs text-[#1e3a8a] hover:underline">Mark all read</button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
                        ) : (
                          notifications.map(n => (
                            <Link 
                              key={n.id} 
                              to={n.link || '#'} 
                              onClick={() => { markNotificationRead(n.id).then(fetchNotifications); setNotifOpen(false); }}
                              className={`block px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${n.is_read ? 'opacity-60' : 'bg-blue-50/30'}`}
                            >
                              <div className="font-semibold text-sm text-gray-900">{n.title}</div>
                              <div className="text-xs text-gray-600 mt-0.5">{n.message}</div>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" onMouseLeave={() => setProfileOpen(false)}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 bg-[#1a2744] hover:bg-[#1e2f50] border border-[#2a3a5c] px-3 py-1.5 rounded-full transition"
                  >
                    {user.avatar ? (
                      <img src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white">
                        {user.name?.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-200">{user.name?.split(' ')[0]}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="font-bold text-gray-900 text-sm truncate">{user.name}</div>
                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                      </div>
                      
                      <div className="py-1">
                        <Link 
                          to={`/${user.role}/dashboard`} 
                          onClick={() => setProfileOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a] transition"
                        >
                          Dashboard
                        </Link>
                        {user.role === 'customer' && (
                          <Link 
                            to="/customer/rentals" 
                            onClick={() => setProfileOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a] transition"
                          >
                            My Rentals
                          </Link>
                        )}
                        {user.role === 'supplier' && (
                          <Link 
                            to="/supplier/products" 
                            onClick={() => setProfileOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1e3a8a] transition"
                          >
                            My Listings
                          </Link>
                        )}
                      </div>
                      
                      <div className="py-1 border-t border-gray-100">
                        <button 
                          onClick={() => { logout(); setProfileOpen(false); }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
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
          {!user && <Link to="/for-suppliers" className="block text-gray-300 hover:text-white py-2 text-sm" onClick={() => setIsOpen(false)}>For Suppliers</Link>}
          <Link to="/community" className="block text-gray-300 hover:text-white py-2 text-sm" onClick={() => setIsOpen(false)}>Community</Link>

          {!user ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-700 mt-2">
              <Link to="/login" className="text-center border border-gray-500 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg" onClick={() => setIsOpen(false)}>Sign in</Link>
              <Link to="/browse" className="text-center bg-[#1e3a8a] text-white text-sm font-semibold px-4 py-2 rounded-lg" onClick={() => setIsOpen(false)}>Browse Equipment</Link>
            </div>
          ) : (
            <div className="flex flex-col border-t border-gray-700 mt-2 pt-2">
              <div className="flex items-center gap-3 py-3 px-2 mb-2 bg-[#1a2744] rounded-lg">
                {user.avatar ? (
                  <img src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white">
                    {user.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-white leading-tight">{user.name}</div>
                  <div className="text-[10px] text-gray-400">{user.email}</div>
                </div>
              </div>

              <Link to={`/${user.role}/dashboard`} className="block text-gray-300 hover:text-white py-2.5 px-2 text-sm" onClick={() => setIsOpen(false)}>Dashboard</Link>
              {user.role === 'customer' && <Link to="/customer/rentals" className="block text-gray-300 hover:text-white py-2.5 px-2 text-sm" onClick={() => setIsOpen(false)}>My Rentals</Link>}
              {user.role === 'supplier' && <Link to="/supplier/products" className="block text-gray-300 hover:text-white py-2.5 px-2 text-sm" onClick={() => setIsOpen(false)}>My Listings</Link>}
              
              <button onClick={() => { logout(); setIsOpen(false); }} className="block text-red-400 hover:text-red-300 py-2.5 px-2 text-sm w-full text-left mt-2 border-t border-gray-700">Logout</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}