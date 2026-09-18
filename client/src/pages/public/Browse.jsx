import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, ArrowRight, Star, ChevronRight, SlidersHorizontal, Scale, X, SlidersHorizontal as FilterIcon } from 'lucide-react';
import { getProducts } from '../../api/products';
import { PRODUCTS } from '../../data/products';

const CATEGORY_FILTERS = [
  { label: 'All categories', count: null, value: '' },
  { label: 'Cameras & Drones', count: 128, value: 'Cameras & Drones' },
  { label: 'Camping Equipment', count: 96, value: 'Camping Equipment' },
  { label: 'Sports Equipment', count: 74, value: 'Sports Equipment' },
  { label: 'Event Equipment', count: 63, value: 'Event Equipment' },
  { label: 'Household Equipment', count: 87, value: 'Household Equipment' },
  { label: 'School Project Equipment', count: 52, value: 'School Project Equipment' },
];

const PRICE_FILTERS = [
  { label: 'Any price', value: '' },
  { label: 'Under ₱700 / day', value: '0-700' },
  { label: '₱700 – ₱1,500 / day', value: '700-1500' },
  { label: '₱1,500 – ₱2,500 / day', value: '1500-2500' },
  { label: '₱2,500+ / day', value: '2500-99999' },
];

/* ─── Stars ─────────────────────────────────────────────────── */
function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ─── Status badge ───────────────────────────────────────────── */
function StatusBadge({ status }) {
  if (status === 'available') return (
    <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Available
    </span>
  );
  if (status === 'limited') return (
    <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Limited stock
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" /> Rented out
    </span>
  );
}

/* ─── Product card ───────────────────────────────────────────── */
function ProductCard({ product }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow group">
      {/* Image */}
      <div className="relative h-52 bg-[#f5f0e8] overflow-hidden">
        <img
          src={product.images?.[0] || product.image || product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3">
          <StatusBadge status={product.status || (product.available ? 'available' : 'rented')} />
        </div>
        {product.popular && (
          <div className="absolute top-3 right-3">
            <span className="bg-[#1e3a8a] text-white text-xs font-bold px-2.5 py-1 rounded-full">Popular</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Category + rating row */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
            {product.categoryKey || product.category_name || product.category || ''}
          </span>
          <div className="flex items-center gap-1">
            <Stars rating={product.rating || product.average_rating || 4.8} />
            <span className="text-xs font-semibold text-gray-700">
              {Number(product.rating || product.average_rating || 4.8).toFixed(1)}
            </span>
          </div>
        </div>

        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1.5 line-clamp-2">{product.name}</h3>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
          {product.description || 'Quality gear available for rent. Contact supplier for more details.'}
        </p>

        {/* Location + min days */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {product.location || 'Philippines'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Min {product.minDays || 1} day
          </span>
        </div>

        {/* Price + actions */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl font-extrabold text-gray-900">
              ₱{Number(product.price || product.price_per_day || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">per day</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition">
              <Scale className="w-3.5 h-3.5" />
            </button>
            <Link
              to={`/product/${product.id}`}
              className="flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition"
            >
              View <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Browse Page ───────────────────────────────────────── */
export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [availability, setAvailability] = useState({ available: false, limited: false, rented: false });
  const [sortBy, setSortBy] = useState('popular');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  useEffect(() => {
    getProducts({ limit: 50 })
      .then(res => setProducts(res.data?.data?.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allProducts = products.length > 0 ? products : PRODUCTS;

  /* ── Filtering ── */
  const filtered = allProducts.filter(p => {
    const name = (p.name || p.title || '').toLowerCase();
    const cat = (p.category_name || p.category || '');
    const price = p.price || p.price_per_day || 0;
    const status = p.status || (p.available ? 'available' : 'rented');

    if (headerSearch && !name.includes(headerSearch.toLowerCase())) return false;
    if (selectedCategory && cat !== selectedCategory) return false;
    if (selectedPrice) {
      const [min, max] = selectedPrice.split('-').map(Number);
      if (price < min || price > max) return false;
    }
    const anyAvail = availability.available || availability.limited || availability.rented;
    if (anyAvail) {
      if (availability.available && status !== 'available') return false;
      if (availability.limited && status !== 'limited') return false;
      if (availability.rented && status !== 'rented') return false;
    }
    return true;
  });

  /* ── Sorting ── */
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'popular') return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
    if (sortBy === 'price-asc') return (a.price || a.price_per_day || 0) - (b.price || b.price_per_day || 0);
    if (sortBy === 'price-desc') return (b.price || b.price_per_day || 0) - (a.price || a.price_per_day || 0);
    if (sortBy === 'rating') return (b.rating || b.average_rating || 0) - (a.rating || a.average_rating || 0);
    return 0;
  });

  const clearAll = () => {
    setSelectedCategory('');
    setSelectedPrice('');
    setAvailability({ available: false, limited: false, rented: false });
    setHeaderSearch('');
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-sans">

      {/* ── HEADER BANNER ─────────────────────────────────────── */}
      <div className="bg-[#f5f0e8] border-b border-gray-200 px-4 sm:px-6 py-5">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <Link to="/" className="text-[#1e3a8a] hover:underline">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-700">Browse equipment</span>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">Browse rental equipment</h1>
              <p className="text-sm text-gray-500">
                {sorted.length} items from verified suppliers.
              </p>
            </div>

            {/* Search bar + mobile filters button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex-1">
                <div className="flex items-center gap-2 px-3 flex-1">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={headerSearch}
                    onChange={e => setHeaderSearch(e.target.value)}
                    placeholder="Search cameras, tents, bikes..."
                    className="py-2.5 text-sm text-gray-800 outline-none bg-transparent w-full placeholder-gray-400"
                  />
                </div>
              </div>
              {/* Filters button — mobile only */}
              <button
                onClick={() => setFilterDrawerOpen(true)}
                className="lg:hidden flex items-center gap-1.5 bg-[#1e3a8a] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex-shrink-0"
              >
                <FilterIcon className="w-4 h-4" />
                Filters
              </button>
              {/* Search button — desktop */}
              <button className="hidden lg:block bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition flex-shrink-0">
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER OVERLAY ───────────────────────── */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setFilterDrawerOpen(false)} />
          {/* Drawer */}
          <div className="absolute top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <span className="font-bold text-gray-900 text-base">Filters</span>
              <div className="flex items-center gap-3">
                <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-800">Clear all</button>
                <button onClick={() => setFilterDrawerOpen(false)} className="text-gray-500 hover:text-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="px-5 py-5">
              {/* Category */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Category</h3>
                <div className="space-y-1">
                  {CATEGORY_FILTERS.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                        selectedCategory === cat.value
                          ? 'bg-blue-50 text-[#1e3a8a] font-semibold'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {cat.count && (
                        <span className={`text-xs ${selectedCategory === cat.value ? 'text-[#1e3a8a]' : 'text-gray-400'}`}>
                          {cat.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 mb-6" />
              {/* Price */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Price per day</h3>
                <div className="space-y-1">
                  {PRICE_FILTERS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setSelectedPrice(p.value)}
                      className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-gray-100 transition text-left group"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                        selectedPrice === p.value ? 'border-[#1e3a8a] bg-[#1e3a8a]' : 'border-gray-300 group-hover:border-gray-400'
                      }`}>
                        {selectedPrice === p.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className={`text-sm transition ${selectedPrice === p.value ? 'text-[#1e3a8a] font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 mb-6" />
              {/* Availability */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Availability</h3>
                <div className="space-y-2">
                  {[
                    { key: 'available', label: 'Available now' },
                    { key: 'limited', label: 'Limited stock' },
                    { key: 'rented', label: 'Currently rented out' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        onClick={() => setAvailability(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                          availability[key] ? 'border-[#1e3a8a] bg-[#1e3a8a]' : 'border-gray-300 group-hover:border-gray-400'
                        }`}
                      >
                        {availability[key] && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span
                        onClick={() => setAvailability(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="text-sm text-gray-600 group-hover:text-gray-900 transition"
                      >
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {/* Apply button */}
            <div className="px-5 pb-6">
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="w-full bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl transition"
              >
                Show {sorted.length} results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BODY: sidebar + grid ───────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-8 items-start">

          {/* ── LEFT SIDEBAR — desktop only ─────────────────────── */}
          <aside className="hidden lg:block w-60 flex-shrink-0">
            {/* Filters header */}
            <div className="flex items-center justify-between mb-5">
              <span className="font-bold text-gray-900 text-base">Filters</span>
              <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-800 transition">Clear all</button>
            </div>

            {/* Category */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Category</h3>
              <div className="space-y-1">
                {CATEGORY_FILTERS.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                      selectedCategory === cat.value
                        ? 'bg-blue-50 text-[#1e3a8a] font-semibold'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {cat.count && (
                      <span className={`text-xs ${selectedCategory === cat.value ? 'text-[#1e3a8a]' : 'text-gray-400'}`}>
                        {cat.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 mb-6" />

            {/* Price per day */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Price per day</h3>
              <div className="space-y-1">
                {PRICE_FILTERS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setSelectedPrice(p.value)}
                    className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-gray-100 transition text-left group"
                  >
                    {/* Radio circle */}
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      selectedPrice === p.value
                        ? 'border-[#1e3a8a] bg-[#1e3a8a]'
                        : 'border-gray-300 group-hover:border-gray-400'
                    }`}>
                      {selectedPrice === p.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    {/* Label */}
                    <span className={`text-sm transition ${
                      selectedPrice === p.value
                        ? 'text-[#1e3a8a] font-semibold'
                        : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 mb-6" />

            {/* Availability */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Availability</h3>
              <div className="space-y-2">
                {[
                  { key: 'available', label: 'Available now' },
                  { key: 'limited', label: 'Limited stock' },
                  { key: 'rented', label: 'Currently rented out' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                    <div
                      onClick={() => setAvailability(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                        availability[key] ? 'border-[#1e3a8a] bg-[#1e3a8a]' : 'border-gray-300 group-hover:border-gray-400'
                      }`}
                    >
                      {availability[key] && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span
                      onClick={() => setAvailability(prev => ({ ...prev, [key]: !prev[key] }))}
                      className="text-sm text-gray-600 group-hover:text-gray-900 transition"
                    >
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Renting tip card */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-green-800 mb-1">Renting tip</div>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Booking 3+ days usually drops the effective daily rate. Try widening your rental window to save more.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* ── MAIN GRID ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-900">{sorted.length}</span> of{' '}
                <span className="font-semibold text-gray-900">{allProducts.length}</span> listings
              </p>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none cursor-pointer hover:border-gray-300 transition"
                >
                  <option value="popular">Most popular</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="rating">Highest rated</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-gray-400 text-lg font-medium mb-2">No listings match your filters</p>
                <button onClick={clearAll} className="text-[#1e3a8a] text-sm hover:underline">Clear all filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {sorted.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}