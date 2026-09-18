import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, Users, Shield, Settings, Camera, Tent,
  Bike, PartyPopper, Wrench, BookOpen, ChevronDown,
  ChevronUp, Star, ArrowRight, Check, TrendingUp,
  ClipboardList, Bell, BadgeCheck, MapPin, BarChart3,
  HeadphonesIcon, Package
} from 'lucide-react';

/* ─── Data ─────────────────────────────────────────────────── */
const BENEFITS = [
  { icon: DollarSign, title: 'Earn Extra Income', color: 'bg-amber-50 text-amber-600', desc: 'Generate passive income from equipment you already own. Your gear earns while you\'re not using it.' },
  { icon: Users, title: 'Reach More Customers', color: 'bg-blue-50 text-blue-600', desc: 'Connect with thousands of verified renters actively looking for equipment in your city and nearby areas.' },
  { icon: Shield, title: 'Secure Transactions', color: 'bg-green-50 text-green-600', desc: 'Bookings, rental records, and all communication are managed through our secure platform — nothing falls through the cracks.' },
  { icon: Settings, title: 'Flexible Listings', color: 'bg-purple-50 text-purple-600', desc: 'Set your own prices, availability windows, minimum rental periods, and rental terms — complete control stays with you.' },
];

const STEPS = [
  { n: '01', icon: BadgeCheck, title: 'Create a Supplier Account', desc: 'Register with your email, verify your identity, and set up your supplier profile in minutes.' },
  { n: '02', icon: Package, title: 'List Your Equipment', desc: 'Upload photos, set your daily rate, minimum rental days, and availability. No listing fee.' },
  { n: '03', icon: Bell, title: 'Receive Booking Requests', desc: 'Get notified when a renter requests your item. Review the request and confirm or decline.' },
  { n: '04', icon: DollarSign, title: 'Earn From Every Rental', desc: 'Payment is released to your account after a successful rental completion. Withdraw anytime.' },
];

const CATEGORIES = [
  { icon: Camera, label: 'Cameras & Drones', desc: 'DSLRs, mirrorless bodies, drones, lenses, lighting kits', earn: '₱800–₱2,400 / day' },
  { icon: Tent, label: 'Camping Equipment', desc: 'Tents, sleeping bags, stoves, generators, cookware', earn: '₱450–₱1,200 / day' },
  { icon: Bike, label: 'Sports Equipment', desc: 'Mountain bikes, kayaks, paddle boards, helmets', earn: '₱700–₱950 / day' },
  { icon: PartyPopper, label: 'Event Equipment', desc: 'PA systems, canopy tents, tables, chairs, DJ gear', earn: '₱1,200–₱1,900 / day' },
  { icon: Wrench, label: 'Household Equipment', desc: 'Power tools, carpet cleaners, ladders, appliances', earn: '₱450–₱890 / day' },
  { icon: BookOpen, label: 'School Project Equipment', desc: 'Projectors, screens, presentation tools, displays', earn: '₱800–₱1,100 / day' },
];

const EARNINGS = [
  { item: 'DSLR Camera', rate: '₱1,200', rentals: 8, income: '₱9,600' },
  { item: 'Camping Tent', rate: '₱650', rentals: 10, income: '₱6,500' },
  { item: 'Mountain Bike', rate: '₱800', rentals: 12, income: '₱9,600' },
  { item: 'PA Speaker System', rate: '₱1,900', rentals: 6, income: '₱11,400' },
  { item: 'Cordless Drill Kit', rate: '₱450', rentals: 14, income: '₱6,300' },
];

const STATS = [
  { value: '500+', label: 'Active Listings' },
  { value: '1,000+', label: 'Rentals Completed' },
  { value: '95%', label: 'Supplier Satisfaction' },
  { value: '100%', label: 'Verified Suppliers' },
];

const TRUST = [
  { icon: BadgeCheck, text: 'Verified renters before every booking' },
  { icon: Shield, text: 'Secure end-to-end booking process' },
  { icon: BarChart3, text: 'Transparent pricing with no hidden fees' },
  { icon: ClipboardList, text: 'Full rental history tracking & records' },
  { icon: HeadphonesIcon, text: '7-day customer support team' },
  { icon: MapPin, text: 'Local community marketplace focus' },
];

const TESTIMONIALS = [
  { name: 'Jun Reyes', category: 'Cameras & Drones', location: 'Makati City', rating: 5, text: 'I listed my Sony A7 III when I wasn\'t shooting and earned ₱14,000 in the first month. The platform handled everything — I just dropped off and picked up the gear.' },
  { name: 'Maricel Santos', category: 'Event Equipment', location: 'Cebu City', rating: 5, text: 'My PA system used to sit in the garage 20 days a month. Now it generates over ₱10,000 monthly. Booking confirmations come straight to my phone.' },
  { name: 'Carlo Mendoza', category: 'Camping Equipment', location: 'Antipolo City', rating: 5, text: 'Started with one tent, now I have eight items listed. The rental dashboard makes it easy to track everything. Rent-A-Way is the best side income I\'ve ever had.' },
];

const FAQS = [
  { q: 'How much does it cost to list equipment?', a: 'Listing is completely free. Rent-A-Way only earns a small service fee when a rental is successfully completed — so there\'s zero risk to you for listing.' },
  { q: 'How do I receive payments?', a: 'Payments are released to your registered bank or e-wallet account after the rental is confirmed as successfully completed. You can withdraw at any time once funds are available.' },
  { q: 'Can I set my own rental rates?', a: 'Yes, absolutely. You have full control over your daily rate, minimum rental duration, deposit amount, and any additional terms you want renters to agree to.' },
  { q: 'What equipment can I list?', a: 'You can list cameras & drones, camping gear, sports equipment, event supplies, household tools, and school project equipment — any item that follows our marketplace guidelines.' },
  { q: 'How are suppliers verified?', a: 'All supplier accounts undergo an identity and listing review process. Our team manually checks each listing before it goes live to ensure quality and safety for renters.' },
  { q: 'What happens if equipment is damaged?', a: 'Renters can opt into our damage protection plan (₱250 per rental). We also encourage suppliers to document equipment condition before and after each rental for added protection.' },
];

/* ─── Sub-components ────────────────────────────────────────── */
function Stars({ n }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`w-4 h-4 ${i<=n?'text-amber-400':'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function ForSuppliers() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="bg-[#f5f0e8] font-sans">

      {/* ══ HERO ═════════════════════════════════════════════════ */}
      <section className="bg-[#0f1729] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#1a2744] opacity-40 translate-x-1/3 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#1a2744] opacity-30 -translate-x-1/3 translate-y-1/3" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-6">
                For Suppliers
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Turn Your Equipment<br />
                <span className="text-amber-400">Into Income</span>
              </h1>
              <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                Join Rent-A-Way and earn from cameras, camping gear, sports equipment, event supplies, household tools, and school project equipment.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-[#0f1729] font-bold px-8 py-4 rounded-xl transition text-sm">
                  Start Listing <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 border border-white/20 text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-xl transition text-sm">
                  Learn How It Works
                </a>
              </div>
            </div>

            {/* Right illustration */}
            <div className="flex-shrink-0 w-full lg:w-[420px]">
              <div className="relative bg-[#1a2744] rounded-3xl p-6 border border-[#2a3a5c]">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=85&fit=crop"
                  alt="Supplier listing equipment"
                  className="w-full h-56 object-cover rounded-2xl mb-4"
                />
                {/* Floating earnings card */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">This month</div>
                    <div className="text-base font-extrabold text-gray-900">₱9,600 earned</div>
                  </div>
                </div>
                {/* Floating rating card */}
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400" fill="currentColor" />
                    <span className="font-extrabold text-gray-900">4.9</span>
                    <span className="text-xs text-gray-400">rating</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS STRIP ══════════════════════════════════════════ */}
      <section className="bg-[#1e3a8a]">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-extrabold text-amber-400 mb-1">{value}</div>
              <div className="text-blue-200 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ BENEFITS ═════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <div className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">Why join us</div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">Why Become a Supplier?</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Everything you need to start earning from equipment you already own.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map(({ icon: Icon, title, color, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition">
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════ */}
      <section id="how-it-works" className="bg-[#0f1729] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-3">Simple process</div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">How It Works</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Get from zero to earning in four straightforward steps.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-[#2a3a5c] z-0" />
            {STEPS.map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-[#1e3a8a] border-4 border-[#0f1729] flex items-center justify-center mb-4 shadow-lg">
                  <Icon className="w-8 h-8 text-amber-400" />
                </div>
                <div className="text-amber-400 text-xs font-bold tracking-widest mb-2">{n}</div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CATEGORIES ══════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <div className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">What you can list</div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">Equipment Categories</h2>
          <p className="text-gray-500 max-w-xl mx-auto">We accept a wide range of equipment across six high-demand categories.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map(({ icon: Icon, label, desc, earn }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1e3a8a] flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
                <p className="text-xs text-gray-500 mb-2 leading-snug">{desc}</p>
                <div className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3" /> {earn}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ EARNINGS EXAMPLE ════════════════════════════════════ */}
      <section className="bg-[#1e3a8a] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-3">Sample earnings</div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">See What Suppliers Earn</h2>
            <p className="text-blue-200 max-w-xl mx-auto">Based on average rental activity on the Rent-A-Way platform.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl shadow-xl mb-6">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-[#0f1729] text-white">
                  <th className="text-left px-6 py-4 font-semibold">Equipment</th>
                  <th className="text-center px-4 py-4 font-semibold">Daily Rate</th>
                  <th className="text-center px-4 py-4 font-semibold">Rentals / Month</th>
                  <th className="text-right px-6 py-4 font-semibold text-amber-400">Est. Monthly Income</th>
                </tr>
              </thead>
              <tbody>
                {EARNINGS.map((row, i) => (
                  <tr key={row.item} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 font-medium text-gray-900">{row.item}</td>
                    <td className="px-4 py-4 text-center text-gray-600">{row.rate}</td>
                    <td className="px-4 py-4 text-center text-gray-600">{row.rentals}×</td>
                    <td className="px-6 py-4 text-right font-extrabold text-green-600">{row.income}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-blue-200 text-xs text-center">
            * Earnings are estimates based on average platform rental frequency. Actual income varies depending on item demand, location, listing quality, and availability.
          </p>
        </div>
      </section>

      {/* ══ TRUST ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <div className="flex-1">
            <div className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">Built for trust</div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-6">Why Suppliers Trust Rent-A-Way</h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              We built the platform with suppliers in mind. Every feature — from verified renter profiles to rental history records — is designed to protect your equipment and your income.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold px-6 py-3 rounded-xl transition text-sm">
              Join as a Supplier <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRUST.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-[#1e3a8a]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#1e3a8a]" />
                </div>
                <span className="text-sm text-gray-700 font-medium leading-snug pt-1">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ════════════════════════════════════════ */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">Real suppliers</div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">What Our Suppliers Say</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Join hundreds of suppliers already earning on Rent-A-Way.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, category, location, rating, text }) => (
              <div key={name} className="bg-[#f5f0e8] rounded-2xl p-6 border border-gray-100">
                <Stars n={rating} />
                <p className="text-gray-700 text-sm leading-relaxed my-4">"{text}"</p>
                <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0">
                    {name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{name}</div>
                    <div className="text-xs text-gray-500">{category} · {location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ═════════════════════════════════════════════════ */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">Common questions</div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map(({ q, a }, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-semibold text-gray-900 text-sm pr-4">{q}</span>
                {openFaq === i
                  ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════ */}
      <section className="bg-[#0f1729] py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#1a2744] opacity-50 translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[#1a2744] opacity-40 -translate-x-1/4 translate-y-1/4" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">Ready to start?</div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
            Start Earning From Equipment<br />You Already Own
          </h2>
          <p className="text-gray-300 text-lg mb-10">
            Join the growing Rent-A-Way supplier community today. Listing is free and takes less than 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-[#0f1729] font-bold px-10 py-4 rounded-xl transition">
              Become a Supplier <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="mailto:suppliers@rentaway.ph" className="inline-flex items-center justify-center gap-2 border border-white/20 text-white hover:bg-white/10 font-semibold px-10 py-4 rounded-xl transition">
              Contact Sales
            </a>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-gray-400">
            {['Free to list', 'No monthly fees', 'Cancel anytime'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-400" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
