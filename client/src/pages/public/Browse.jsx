import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, ArrowRight, Star, ChevronRight, SlidersHorizontal, Scale, X, SlidersHorizontal as FilterIcon, ChevronLeft, ChevronRight as ChevronRight2 } from 'lucide-react';
import { getProducts, getCategories } from '../../api/products';
import { useFavorites } from '../../context/FavoritesContext';

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
  const { favoriteIds, toggleFavorite } = useFavorites();
  const isFavorite = favoriteIds?.has(product.id);

  const image = product.primary_image ? (product.primary_image.startsWith('http') ? product.primary_image : `http://localhost:5000${product.primary_image}`) : 'https://placehold.co/500x400/1e3a8a/ffffff?text=Product';
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow group flex flex-col">
      {/* Image */}
      <div className="relative h-52 bg-[#f5f0e8] overflow-hidden">
        <img
          src={image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <StatusBadge status={product.availability || 'available'} />
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

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Category + rating row */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
            {product.category}
          </span>
          <div className="flex items-center gap-1">
            <Stars rating={product.avg_rating || 0} />
            <span className="text-xs font-semibold text-gray-700">
              {Number(product.avg_rating || 0).toFixed(1)}
            </span>
          </div>
        </div>

        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1.5 line-clamp-2">
          {product.is_super_supplier ? (
            <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 align-text-bottom shadow-sm" title="Super Supplier">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Super
            </span>
          ) : null}
          {product.title}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
          {product.description}
        </p>

        {/* Location + min days */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 mt-auto">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Philippines
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Min {product.min_days || 1} day
          </span>
        </div>

        {/* Price + actions */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl font-extrabold text-gray-900">
              ₱{Number(product.price_per_day || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">per day</div>
          </div>
          <div className="flex items-center gap-2">
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

import { Helmet } from 'react-helmet-async';

/* ─── Main Browse Page ───────────────────────────────────────── */
export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Sync state with URL params
  const search = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const priceRange = searchParams.get('price') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');

  // Local state for the header input (only updates URL on enter/click)
  const [headerSearch, setHeaderSearch] = useState(search);
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  useEffect(() => {
    setHeaderSearch(search);
  }, [search]);

  // Fetch categories once
  useEffect(() => {
    getCategories().then(res => {
      setCategories([{ name: 'All categories', value: '', count: null }, ...res.data.data.map(c => ({ ...c, value: c.name }))]);
    }).catch(console.error);
  }, []);

  // Fetch products on param change
  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (search) params.search = search;
    if (category) params.category = category;
    if (priceRange) {
      const [min, max] = priceRange.split('-');
      params.minPrice = min;
      params.maxPrice = max;
    }
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    
    getProducts(params)
      .then(res => {
        setProducts(res.data?.data?.products || []);
        setTotal(res.data?.data?.total || 0);
        setTotalPages(res.data?.data?.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category, priceRange, page]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // reset to page 1 on filter change
    if (key !== 'page') newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParam('q', headerSearch);
  };

  const clearAll = () => {
    setSearchParams(new URLSearchParams());
    setHeaderSearch('');
    setLocalStartDate('');
    setLocalEndDate('');
    setFilterDrawerOpen(false);
  };

  const applyDates = () => {
    if ((localStartDate && localEndDate) || (!localStartDate && !localEndDate)) {
      const newParams = new URLSearchParams(searchParams);
      if (localStartDate) newParams.set('startDate', localStartDate);
      else newParams.delete('startDate');
      if (localEndDate) newParams.set('endDate', localEndDate);
      else newParams.delete('endDate');
      newParams.set('page', '1');
      setSearchParams(newParams);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-sans">
      <Helmet>
        <title>{category ? `${category} Rentals` : 'Browse Rentals'} | Rent-A-Way</title>
        <meta name="description" content={`Browse our selection of ${category ? category.toLowerCase() : 'equipment'} available for rent in the Philippines.`} />
      </Helmet>

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
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">Browse rentals</h1>
                <p className="text-sm text-gray-500">
                  {total} item{total !== 1 ? 's' : ''} available
                </p>
              </div>
              <Link 
                to={`/map?category=${encodeURIComponent(category)}`} 
                className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                <MapPin className="w-4 h-4" /> Map View
              </Link>
            </div>

            {/* Search bar + mobile filters button */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex-1">
                <div className="flex items-center gap-2 px-3 flex-1">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={headerSearch}
                    onChange={e => setHeaderSearch(e.target.value)}
                    placeholder="Search equipment..."
                    className="py-2.5 text-sm text-gray-800 outline-none bg-transparent w-full placeholder-gray-400"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(true)}
                className="lg:hidden flex items-center gap-1.5 bg-[#1e3a8a] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition flex-shrink-0"
              >
                <FilterIcon className="w-4 h-4" />
                Filters
              </button>
              <button type="submit" className="hidden lg:block bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition flex-shrink-0">
                Search
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER OVERLAY ───────────────────────── */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFilterDrawerOpen(false)} />
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
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => updateParam('category', cat.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                        category === cat.value ? 'bg-blue-50 text-[#1e3a8a] font-semibold' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{cat.name}</span>
                      {cat.count > 0 && <span className="text-xs text-gray-400">{cat.count}</span>}
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
                      onClick={() => updateParam('price', p.value)}
                      className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-gray-100 transition text-left group"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                        priceRange === p.value ? 'border-[#1e3a8a] bg-[#1e3a8a]' : 'border-gray-300 group-hover:border-gray-400'
                      }`}>
                        {priceRange === p.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className={`text-sm transition ${priceRange === p.value ? 'text-[#1e3a8a] font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
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
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      min={today}
                      value={localStartDate}
                      onChange={e => {
                        setLocalStartDate(e.target.value);
                        if (e.target.value && localEndDate && e.target.value > localEndDate) setLocalEndDate(e.target.value);
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      min={localStartDate || today}
                      value={localEndDate}
                      onChange={e => setLocalEndDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] transition"
                    />
                  </div>
                  <button onClick={applyDates} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-2 rounded-lg transition">
                    Apply Dates
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 pb-6">
              <button onClick={() => setFilterDrawerOpen(false)} className="w-full bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl transition">
                Show results
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
            <div className="flex items-center justify-between mb-5">
              <span className="font-bold text-gray-900 text-base">Filters</span>
              <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-800 transition">Clear all</button>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Category</h3>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => updateParam('category', cat.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                      category === cat.value ? 'bg-blue-50 text-[#1e3a8a] font-semibold' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.count > 0 && <span className="text-xs text-gray-400">{cat.count}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-200 mb-6" />
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Price per day</h3>
              <div className="space-y-1">
                {PRICE_FILTERS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => updateParam('price', p.value)}
                    className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-gray-100 transition text-left group"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      priceRange === p.value ? 'border-[#1e3a8a] bg-[#1e3a8a]' : 'border-gray-300 group-hover:border-gray-400'
                    }`}>
                      {priceRange === p.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className={`text-sm transition ${priceRange === p.value ? 'text-[#1e3a8a] font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-200 mb-6" />
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Availability</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    min={today}
                    value={localStartDate}
                    onChange={e => {
                      setLocalStartDate(e.target.value);
                      if (e.target.value && localEndDate && e.target.value > localEndDate) setLocalEndDate(e.target.value);
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    min={localStartDate || today}
                    value={localEndDate}
                    onChange={e => setLocalEndDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] transition"
                  />
                </div>
                <button onClick={applyDates} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-2 rounded-lg transition">
                  Apply Dates
                </button>
              </div>
            </div>
          </aside>

          {/* ── MAIN GRID ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col min-h-[500px]">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col animate-pulse">
                    <div className="h-52 bg-gray-200"></div>
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
            ) : products.length === 0 ? (
              <div className="text-center py-24 flex-1">
                <p className="text-gray-400 text-lg font-medium mb-2">No listings match your filters</p>
                <button onClick={clearAll} className="text-[#1e3a8a] text-sm hover:underline">Clear all filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-auto flex justify-center items-center gap-2 border-t border-gray-200 pt-6">
                    <button 
                      disabled={page === 1}
                      onClick={() => updateParam('page', page - 1)}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-semibold px-4">
                      Page {page} of {totalPages}
                    </span>
                    <button 
                      disabled={page === totalPages}
                      onClick={() => updateParam('page', page + 1)}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}