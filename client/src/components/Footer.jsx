import { Link } from 'react-router-dom';
import { Shield, Facebook, Instagram, Youtube } from 'lucide-react';

const RENTALS = [
  { label: 'Cameras & Drones', to: '/browse?category=Cameras' },
  { label: 'Camping Equipment', to: '/browse?category=Camping' },
  { label: 'Sports Equipment', to: '/browse?category=Sports' },
  { label: 'Event Equipment', to: '/browse?category=Event' },
  { label: 'Household Equipment', to: '/browse?category=Household' },
  { label: 'School Project Equipment', to: '/browse?category=School' },
];

const COMPANY = [
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'For Suppliers', to: '/for-suppliers' },
  { label: 'My Rentals', to: '/customer/rentals' },
  { label: 'Community', to: '/community' },
  { label: 'Browse Equipment', to: '/browse' },
  { label: 'Admin Console', to: '/admin/dashboard' },
];

const SUPPORT = [
  { label: 'Help & FAQs', to: '#' },
  { label: 'Rental Terms', to: '#' },
  { label: 'Trust & Safety', to: '#' },
  { label: 'Contact Us', to: '#' },
];

// TikTok icon (not in lucide)
function TikTokIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.27 8.27 0 004.84 1.55V6.85a4.84 4.84 0 01-1.07-.16z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#0f1729] text-gray-400">
      {/* Main footer grid */}
      <div className="max-w-6xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand column */}
        <div>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-full border-2 border-amber-400 bg-[#1a2744] flex items-center justify-center flex-shrink-0">
              <span className="text-amber-400 font-black text-xs">RW</span>
            </div>
            <div className="leading-none">
              <div className="font-bold text-white text-sm tracking-tight">Rent-A-Way</div>
              <div className="text-[9px] text-gray-500 tracking-widest uppercase">Find Better Ways to Save</div>
            </div>
          </Link>

          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            The <span className="text-[#4a7fd4]">rental marketplace</span> that connects{' '}
            <span className="text-[#4a7fd4]">people</span> who need things with trusted local{' '}
            <span className="text-[#4a7fd4]">suppliers</span> — cameras, camping gear, sports, event, household and school{' '}
            <span className="text-[#4a7fd4]">equipment</span>.
          </p>

          {/* Socials */}
          <div className="flex items-center gap-3">
            {[
              { icon: Facebook, href: '#' },
              { icon: Instagram, href: '#' },
              { icon: TikTokIcon, href: '#' },
              { icon: Youtube, href: '#' },
            ].map(({ icon: Icon, href }, i) => (
              <a
                key={i}
                href={href}
                className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-white transition"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        {/* Rentals column */}
        <div>
          <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-5">Rentals</h4>
          <ul className="space-y-3">
            {RENTALS.map(l => (
              <li key={l.to}>
                <Link to={l.to} className="text-sm text-gray-400 hover:text-white transition">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company column */}
        <div>
          <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-5">Company</h4>
          <ul className="space-y-3">
            {COMPANY.map(l => (
              <li key={l.to}>
                <Link to={l.to} className={`text-sm hover:text-white transition ${['For Suppliers', 'Community'].includes(l.label) ? 'text-[#4a7fd4]' : 'text-gray-400'}`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support column */}
        <div>
          <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-5">Support</h4>
          <ul className="space-y-3 mb-6">
            {SUPPORT.map(l => (
              <li key={l.label}>
                <a href={l.to} className="text-sm text-gray-400 hover:text-white transition">{l.label}</a>
              </li>
            ))}
          </ul>

          {/* Verified suppliers badge */}
          <div className="border border-gray-700 rounded-xl p-3.5 flex items-start gap-3 bg-[#131d30]">
            <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div>
              <div className="text-white text-sm font-semibold">Verified suppliers only</div>
              <div className="text-gray-500 text-xs mt-0.5">Every listing is reviewed before it goes live.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-gray-600">© 2026 Rent-A-Way. All rights reserved.</span>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <a href="#" className="hover:text-gray-400 transition">Terms of Service</a>
            <span className="text-gray-700">|</span>
            <a href="#" className="hover:text-gray-400 transition">Privacy Policy</a>
            <span className="text-gray-700">|</span>
            <a href="#" className="hover:text-gray-400 transition">Rental Agreement</a>
          </div>
        </div>
      </div>
    </footer>
  );
}