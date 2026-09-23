import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Shield, Check, ChevronDown, Camera, Mountain, Bike, Calendar, Wrench, BookOpen, Star, MapPin, Clock, ArrowRight, RotateCcw, MessageSquare, Navigation } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getProducts, getCategories } from '../../api/products';
import { useFavorites } from '../../context/FavoritesContext';
import { useCustomerLocation } from '../../context/CustomerLocationContext';

/* ─── Category data ─────────────────────────────────────────── */
const CATEGORIES = [
  {
    id: 'Cameras',
    name: 'Cameras & Drones',
    subtitle: 'Capture every moment',
    to: '/browse?category=Cameras',
    icon: Camera,
    bg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&q=85&fit=crop',
  },
  {
    id: 'Camping',
    name: 'Camping Equipment',
    subtitle: 'Gear for the great outdoors',
    to: '/browse?category=Camping',
    icon: Mountain,
    bg: 'bg-green-50',
    iconColor: 'text-green-600',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=700&q=85&fit=crop',
  },
  {
    id: 'Sports',
    name: 'Sports Equipment',
    subtitle: 'Play harder, spend less',
    to: '/browse?category=Sports',
    icon: Bike,
    bg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=700&q=85&fit=crop',
  },
  {
    id: 'Event',
    name: 'Event Equipment',
    subtitle: 'Everything for the big day',
    to: '/browse?category=Event',
    icon: Calendar,
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=700&q=85&fit=crop',
  },
  {
    id: 'Household',
    name: 'Household Equipment',
    subtitle: 'Tools for every project',
    to: '/browse?category=Household',
    icon: Wrench,
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=700&q=85&fit=crop',
  },
  {
    id: 'School',
    name: 'School Project Equipment',
    subtitle: 'Ace every project',
    to: '/browse?category=School',
    icon: BookOpen,
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    image: 'https://images.unsplash.com/photo-1532094349884-543290200b6b?w=700&q=85&fit=crop',
  },
];

/* ─── Ticker items ───────────────────────────────────────────── */
const TICKER = [
  { icon: Check, label: 'FREE CANCELLATION UP TO 24H' },
  { icon: Star, label: 'REVIEWS FROM REAL RENTERS' },
  { icon: Shield, label: 'VERIFIED SUPPLIERS ONLY' },
  { icon: MapPin, label: 'PICKUP OR DELIVERY' },
  { icon: Shield, label: 'SECURE ONLINE PAYMENT' },
  { icon: Clock, label: 'LOYALTY REWARDS' },
];

/* ─── Removed Mock Data ────── */

/* ─── Stars helper ───────────────────────────────────────────── */
function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ─── Product listing card ───────────────────────────────────── */
function ListingCard({ product }) {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { getItemDistance } = useCustomerLocation();
  const isFavorite = favoriteIds?.has(product.id);

  const name = product.title || product.name || 'Unnamed Product';
  const category = (product.category || product.category_name || '').toUpperCase();
  const rating = product.avg_rating || product.rating || null;
  const price = product.price_per_day || product.price || 0;
  const location = product.location || 'Philippines';
  const distanceText = getItemDistance(product.latitude, product.longitude);
  const image = product.primary_image ? (product.primary_image.startsWith('http') ? product.primary_image : `http://localhost:5000${product.primary_image}`) : 'https://placehold.co/500x400/1e3a8a/ffffff?text=Product';

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow group flex flex-col">
      <div className="relative h-56 bg-[#f5f0e8] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          {product.popular && (
            <span className="bg-[#1e3a8a] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">Popular</span>
          )}
          <span className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> Available
          </span>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.id); }}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition"
        >
          <svg className={`w-4 h-4 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-gray-400 tracking-widest">{category}</span>
          {rating ? (
            <div className="flex items-center gap-1">
              <Stars rating={rating} />
              <span className="text-xs font-semibold text-gray-700">{Number(rating).toFixed(1)}</span>
            </div>
          ) : (
            <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
              No reviews yet
            </span>
          )}
        </div>

        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">{name}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
          {product.description || 'Quality gear available for rent. Contact supplier for details.'}
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 flex-wrap">
          <span className="flex items-center gap-1" title={location}><MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />{location}</span>
          {distanceText && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
              <Navigation className="w-2.5 h-2.5" />
              {distanceText}
            </span>
          )}
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Min 1 day</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl font-extrabold text-gray-900">₱{Number(price).toLocaleString()}</div>
            <div className="text-xs text-gray-400">per day</div>
          </div>
          <Link
            to={`/product/${product.id}`}
            className="flex items-center gap-1 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition"
          >
            View <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

import { Helmet } from 'react-helmet-async';

/* ─── Main Page ──────────────────────────────────────────────── */
export default function Home() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All categories');
  const [catDropOpen, setCatDropOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProducts({ limit: 6 }),
      getCategories()
    ])
      .then(([productsRes, catsRes]) => {
        setProducts(productsRes.data?.data?.products || []);
        setCategoryCounts(catsRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayProducts = products;

  return (
    <div className="font-sans">
      <Helmet>
        <title>Rent-A-Way | Rent what you need. Save what you don't.</title>
        <meta name="description" content="Trusted rental marketplace in the Philippines. Cameras, camping gear, sports, event, household and school equipment." />
      </Helmet>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section
        className="relative bg-[#0f1729] text-white overflow-hidden"
        style={{ minHeight: '520px' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-[#1a2744] opacity-60" />
        <div className="absolute top-8 -right-24 w-80 h-80 rounded-full bg-[#1a2744] opacity-40" />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full bg-[#1a2744] opacity-30" />

        <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-[#1a2744] border border-[#2a3a5c] text-gray-300 text-xs font-medium px-4 py-2 rounded-full mb-8">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Trusted rental marketplace in the Philippines
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4">
            Rent what you need.<br />
            <span className="text-amber-400">Save what you don't.</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Cameras, camping gear, sports, event, household and school equipment — book it for a few days, use it, return it. No storage, no upkeep, no overspending.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto w-full">
            {/* Mobile: stacked layout */}
            <div className="sm:hidden flex flex-col gap-2">
              <div className="flex items-center bg-white rounded-xl shadow-lg px-4">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="What do you need to rent?"
                  className="flex-1 py-3.5 px-2 text-gray-800 text-sm outline-none bg-transparent placeholder-gray-400"
                />
              </div>
              <Link
                to={`/browse${search ? `?q=${encodeURIComponent(search)}` : ''}`}
                className="flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-3.5 rounded-xl transition"
              >
                <Search className="w-4 h-4" /> Find Rentals
              </Link>
            </div>

            {/* Desktop: horizontal bar */}
            <div className="hidden sm:flex bg-white rounded-xl shadow-2xl">
              {/* Search input */}
              <div className="flex items-center gap-2 px-4 flex-1 min-w-0 rounded-l-xl overflow-hidden">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="What do you need to rent?"
                  className="flex-1 py-4 text-gray-800 text-sm outline-none bg-transparent placeholder-gray-400"
                />
              </div>

              {/* Divider */}
              <div className="w-px bg-gray-200 my-3" />

              {/* Category selector */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setCatDropOpen(!catDropOpen)}
                  className="flex items-center gap-2 px-4 py-4 text-gray-600 text-sm font-medium hover:text-gray-900 transition whitespace-nowrap"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  {selectedCategory}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${catDropOpen ? 'rotate-180' : ''}`} />
                </button>
                {catDropOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCatDropOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      {['All categories', ...CATEGORIES.map(c => c.name)].map(c => (
                        <button
                          key={c}
                          onClick={() => { setSelectedCategory(c); setCatDropOpen(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm transition ${
                            selectedCategory === c
                              ? 'bg-[#1e3a8a] text-white font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Find button */}
              <Link
                to={`/browse${search ? `?q=${encodeURIComponent(search)}` : ''}${selectedCategory !== 'All categories' ? `${search ? '&' : '?'}category=${encodeURIComponent(selectedCategory)}` : ''}`}
                className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-4 transition whitespace-nowrap rounded-r-xl"
              >
                <Search className="w-4 h-4" /> Find Rentals
              </Link>
            </div>

            {/* Search trust badges */}
            <div className="hidden sm:flex items-center justify-center gap-6 mt-4 text-gray-500 text-xs">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gray-400" /> Free cancellation up to 24h</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gray-400" /> Damage protection available</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gray-400" /> Same-day pickup</span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative border-t border-[#1a2744] max-w-4xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { num: '2,400+', label: 'Items available' },
            { num: '180+', label: 'Verified suppliers' },
            { num: '4.8/5', label: 'Average rating' },
            { num: '12,000+', label: 'Rentals completed' },
          ].map(s => (
            <div key={s.num} className="text-center sm:text-left">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{s.num}</div>
              <div className="text-gray-400 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TICKER STRIP ────────────────────────────────────────── */}
      <div className="bg-[#1a1f2e] border-y border-[#2a3044] overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-3">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-2 text-gray-300 text-xs font-semibold tracking-widest mx-6">
              <t.icon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              {t.label}
              <span className="ml-6 text-amber-400">●</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES ──────────────────────────────────────────── */}
      <section className="bg-[#f5f0e8] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-0.5 bg-amber-500" />
                <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">Rent by Category</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight max-w-sm">
                Six categories, thousands of things you can borrow today
              </h2>
              <p className="text-gray-500 mt-3 max-w-md text-sm">
                Whatever the occasion, someone nearby is already renting it out. Pick a category and see what's live.
              </p>
            </div>
            <Link
              to="/browse"
              className="flex items-center gap-2 border border-gray-800 text-gray-800 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-gray-800 hover:text-white transition flex-shrink-0 self-start md:self-auto"
            >
              Browse everything <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 3-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={cat.to}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow"
                >
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden bg-amber-50">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                        {categoryCounts.find(c => c.name === cat.id)?.count || 0} items
                      </span>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4.5 h-4.5 ${cat.iconColor}`} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{cat.name}</div>
                        <div className="text-gray-500 text-xs">{cat.subtitle}</div>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#1e3a8a] group-hover:bg-[#1d4ed8] flex items-center justify-center transition flex-shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── MOST REQUESTED ──────────────────────────────────────── */}
      <section className="bg-[#f5f0e8] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-0.5 bg-amber-500" />
                <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">Most Requested</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                Renters are booking these right now
              </h2>
              <p className="text-gray-500 mt-3 max-w-md text-sm">
                Top-rated gear from suppliers with fast response times and a{' '}
                <span className="text-[#1e3a8a]">track record</span> of clean, on-time handovers.
              </p>
            </div>
            <Link
              to="/browse"
              className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition flex-shrink-0 self-start md:self-auto"
            >
              See all listings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col animate-pulse">
                  <div className="h-56 bg-gray-200"></div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between mb-2"><div className="w-16 h-3 bg-gray-200 rounded"></div><div className="w-12 h-3 bg-gray-200 rounded"></div></div>
                    <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="w-full h-3 bg-gray-200 rounded mb-1"></div>
                    <div className="w-5/6 h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="flex justify-between items-end mt-auto">
                      <div className="w-16 h-6 bg-gray-200 rounded"></div>
                      <div className="w-20 h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-xl mx-auto">
              <div className="w-16 h-16 bg-blue-50 text-[#1e3a8a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 opacity-75" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No equipment available yet</h3>
              <p className="text-sm text-gray-500 mb-6">
                Be the first to list equipment or check back soon as suppliers add new gear!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/for-suppliers"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition"
                >
                  Become a Supplier <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/browse"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-5 py-2.5 rounded-xl transition"
                >
                  Browse Marketplace
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayProducts.map(p => (
                <ListingCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <HowItWorks />

      {/* ── WHY RENT-A-WAY ──────────────────────────────────────── */}
      <WhyRentAWay />

      {/* ── FOR SUPPLIERS ───────────────────────────────────────── */}
      <ForSuppliers />

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <FAQ />

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOW IT WORKS
═══════════════════════════════════════════════════════════════ */
const STEPS = [
  {
    num: '01',
    icon: Search,
    title: 'Search & compare',
    desc: 'Filter by category, price range and availability, then line up your shortlist side by side before you commit.',
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    num: '02',
    icon: Calendar,
    title: 'Pick your dates',
    desc: 'Tell us when you need it and for how long. The total updates instantly as your rental period changes.',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    num: '03',
    icon: Shield,
    title: 'Book & pay securely',
    desc: 'Reserve online and pay with GCash, Maya, credit or debit card, or bank transfer — whatever suits you.',
    color: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    num: '04',
    icon: RotateCcw,
    title: 'Use it, return it',
    desc: 'Pick up from your supplier or arrange delivery. Use the item, return it on the agreed date, done.',
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

function HowItWorks() {
  const [tab, setTab] = useState('rent');
  return (
    <section id="how-it-works" className="bg-[#f5f0e8] py-20 px-4">
      <div className="max-w-5xl mx-auto text-center">
        {/* Section label */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-8 h-0.5 bg-amber-500" />
          <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">How It Works</span>
          <div className="w-8 h-0.5 bg-amber-500" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
          Renting takes four simple steps
        </h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
          Whether you're{' '}
          <span className="text-[#1e3a8a]">borrowing</span> or{' '}
          <span className="text-[#1e3a8a]">lending</span>, the whole{' '}
          <span className="text-[#1e3a8a]">process</span> stays{' '}
          <span className="text-[#1e3a8a]">transparent</span> from first search to final return.
        </p>

        {/* Toggle pills */}
        <div className="inline-flex bg-white border border-gray-200 rounded-full p-1 mb-12">
          <button
            onClick={() => setTab('rent')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition ${tab === 'rent' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            I want to rent
          </button>
          <button
            onClick={() => setTab('lend')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition ${tab === 'lend' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            I want to lend
          </button>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {STEPS.map(step => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="bg-white rounded-2xl p-5 text-left border border-gray-100 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${step.iconColor}`} />
                  </div>
                  <span className="text-3xl font-extrabold text-gray-100">{step.num}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{step.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA row */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/browse"
            className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold text-sm px-6 py-3 rounded-xl transition"
          >
            Start browsing <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/for-suppliers"
            className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-sm px-6 py-3 rounded-xl transition"
          >
            Learn about lending
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WHY RENT-A-WAY
═══════════════════════════════════════════════════════════════ */
const WHY_FEATURES = [
  {
    icon: Shield,
    color: 'bg-green-50',
    iconColor: 'text-green-600',
    title: 'Verified suppliers',
    desc: "Every supplier and listing is reviewed before it appears on Rent-A-Way, so you always know who you're dealing with.",
  },
  {
    icon: Wrench,
    color: 'bg-teal-50',
    iconColor: 'text-teal-600',
    title: 'Damage protection',
    desc: 'Optional protection covers accidental damage during your rental period, so a small mishap never becomes a big bill.',
  },
  {
    icon: Calendar,
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Flexible dates',
    desc: 'Rent for a single afternoon or months on end. Availability updates live, so you only see what you can actually book.',
  },
  {
    icon: Star,
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Genuinely fair prices',
    desc: 'Compare daily rates across suppliers side by side. No hidden fees, no inflated deposits, no surprises at checkout.',
  },
  {
    icon: MapPin,
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    title: 'Local pickup & delivery',
    desc: 'Most items are within a short drive. Choose self-pickup to save more, or arrange delivery straight to your door.',
  },
  {
    icon: MessageSquare,
    color: 'bg-purple-50',
    iconColor: 'text-purple-600',
    title: 'Real reviews',
    desc: 'Only renters who completed a rental can leave a review, so the ratings you read reflect real experiences.',
  },
];

function WhyRentAWay() {
  return (
    <section className="bg-[#f5f0e8] py-20 px-4 border-t border-gray-200">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

          {/* Left column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-0.5 bg-amber-500" />
              <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">Why Rent-A-Way</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
              Borrowing should feel as safe as buying
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              We built Rent-A-Way around the two things renters care about most:{' '}
              <span className="text-[#1e3a8a]">trust</span> and clarity. Clear prices,{' '}
              <span className="text-[#1e3a8a]">verified people</span>, and a rental record you{' '}
              <span className="text-[#1e3a8a]">can actually rely on</span>.
            </p>

            {/* Eco card */}
            <div className="bg-white border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-500 text-lg">🌿</span>
                <span className="text-sm font-bold text-gray-900">Renting is kinder to your wallet and the planet</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed mb-5">
                A drill <span className="text-[#1e3a8a]">gets used</span> for about 13 minutes in its lifetime. Sharing equipment means less manufacturing, less waste, and far more money left in your pocket.
              </p>
              <div className="flex items-center gap-10">
                <div>
                  <div className="text-2xl font-extrabold text-amber-500">73%</div>
                  <div className="text-gray-400 text-xs mt-0.5">average saving vs. buying</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-amber-500">18k kg</div>
                  <div className="text-gray-400 text-xs mt-0.5">of equipment kept in use</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: 2×3 feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {WHY_FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition">
                  <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${f.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5">{f.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOR SUPPLIERS
═══════════════════════════════════════════════════════════════ */
const SUPPLIER_BULLETS = [
  'Set your own daily rate and minimum rental duration',
  'Control availability so nothing gets double-booked',
  "Approve or decline every request before it's confirmed",
  'Track which items are out, with whom, and when they return',
];

function ForSuppliers() {
  return (
    <section className="bg-[#f5f0e8] overflow-hidden border-t border-gray-200">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch">

          {/* Left: full-bleed photo */}
          <div className="relative min-h-[380px] lg:min-h-[460px]">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80"
              alt="Supplier organising camera gear in a shop"
              className="w-full h-full object-cover"
            />
            {/* Floating stat card */}
            <div className="absolute bottom-5 left-5 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1e3a8a] rounded-lg flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">Suppliers average</div>
                <div className="text-xs text-gray-500">+38% bookings in their first 3 months</div>
              </div>
            </div>
          </div>

          {/* Right: content */}
          <div className="px-8 py-14 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-0.5 bg-amber-500" />
              <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">For Suppliers</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
              Your idle gear could be earning every weekend
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              That camera bag, tent or set of folding chairs sitting in storage is money waiting to happen. List it once and let renters find it.
            </p>

            {/* Bullet list */}
            <ul className="space-y-3 mb-8">
              {SUPPLIER_BULLETS.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#1e3a8a] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-gray-700">{b}</span>
                </li>
              ))}
            </ul>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Link
                to="/browse"
                className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold text-sm px-5 py-3 rounded-xl transition"
              >
                Browse live listings <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/supplier/dashboard"
                className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-sm px-5 py-3 rounded-xl transition"
              >
                Preview supplier dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-gray-400 text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              List your equipment now — start earning from verified renters in your area.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FAQ
═══════════════════════════════════════════════════════════════ */
const FAQS = [
  {
    q: 'How does renting work on Rent-A-Way?',
    a: 'Search for what you need, pick your rental dates, and confirm the booking online. You then collect the item from the supplier or arrange delivery, use it for your rental period, and return it on the agreed date. The full rental record stays in your dashboard.',
  },
  { q: 'What can I rent on Rent-A-Way?', a: 'You can rent cameras, drones, camping gear, sports equipment, event supplies, household tools, and school project equipment from verified local suppliers across the Philippines.' },
  { q: 'How much does it cost to rent instead of buy?', a: 'On average, renters save 73% compared to buying. Daily rates vary by item and supplier, but you can compare prices side-by-side on every listing page — no hidden fees.' },
  { q: 'Which payment methods are accepted?', a: 'We accept GCash, Maya, major credit and debit cards, and bank transfers. Payment is processed securely at the time of booking.' },
  { q: 'What happens if an item is damaged during my rental?', a: "Optional damage protection is available at checkout. If you add it, accidental damage during your rental period is covered. If not, you are responsible for repairs up to the item's stated value." },
  { q: 'How do I list my own equipment as a supplier?', a: 'Create a supplier account, add your item with photos, set your daily rate and availability, and your listing goes live after a quick review. Supplier accounts open in our next release.' },
];

function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section className="bg-[#f5f0e8] py-20 px-4 border-t border-gray-200">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-14">

          {/* Left panel */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-0.5 bg-amber-500" />
              <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">Good to Know</span>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight mb-4">
              Questions renters ask us most
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Still unsure about something? Our{' '}
              <span className="text-[#1e3a8a]">support team</span> answers within a few hours on business days.
            </p>

            {/* Talk to human card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-[#1e3a8a] rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">Talk to a human</div>
                <div className="text-xs text-gray-500">support@rent-a-way.com · Mon–Sat, 8am–8pm</div>
              </div>
            </div>
          </div>

          {/* Right: accordion */}
          <div className="lg:col-span-2 space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`rounded-2xl border transition-all ${openIdx === i ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/60 border-gray-100 hover:border-gray-200'}`}
              >
                <button
                  onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                >
                  <span className={`text-sm font-semibold ${openIdx === i ? 'text-gray-900' : 'text-gray-700'}`}>
                    {faq.q}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition ${openIdx === i ? 'bg-[#1e3a8a]' : 'border border-gray-300'}`}>
                    <span className={`text-lg leading-none font-bold ${openIdx === i ? 'text-white' : 'text-gray-500'}`}>
                      {openIdx === i ? '−' : '+'}
                    </span>
                  </div>
                </button>
                {openIdx === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}