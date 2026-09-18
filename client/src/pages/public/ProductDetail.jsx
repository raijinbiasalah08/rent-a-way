import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon,
  MapPin, Calendar, Shield, RotateCcw, Clock,
  ThumbsUp, Star, Check, ArrowRight, Package,
  MessageSquare
} from 'lucide-react';
import { PRODUCTS_MAP, getRelated } from '../../data/products';

/* ─── Helpers ────────────────────────────────────────────────── */
function Stars({ rating, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`${sz} ${i <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'limited') return (
    <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Limited stock
    </span>
  );
  if (status === 'rented') return (
    <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" /> Rented out
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Available
    </span>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ProductDetail() {
  const { id } = useParams();

  // Look up the product — reset carousel index whenever id changes
  const product = PRODUCTS_MAP[id] || Object.values(PRODUCTS_MAP)[0];
  const related = getRelated(product);

  const [imgIdx, setImgIdx] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [damageProtection, setDamageProtection] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState({});

  // Reset carousel + dates when navigating to a different product
  useEffect(() => {
    setImgIdx(0);
    setStartDate('');
    setReturnDate('');
    setDamageProtection(false);
    setHelpfulVotes({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const images = product.images || [];

  /* ── Date / pricing logic ── */
  const today = new Date().toISOString().split('T')[0];
  const days = startDate && returnDate
    ? Math.max(0, Math.ceil((new Date(returnDate) - new Date(startDate)) / 86400000))
    : 0;
  const subtotal = days * product.price;
  const protectionFee = damageProtection ? 250 : 0;
  const total = subtotal + protectionFee;
  const canReserve = days >= product.minDays;

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-sans">

      {/* ── BREADCRUMB ──────────────────────────────────────────── */}
      <div className="bg-[#f5f0e8] border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
          <Link to="/" className="text-[#1e3a8a] hover:underline">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/browse" className="text-[#1e3a8a] hover:underline">Browse</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={`/browse?category=${encodeURIComponent(product.category)}`} className="text-[#1e3a8a] hover:underline">{product.category}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-700 truncate max-w-[240px]">{product.name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ══ LEFT COLUMN ════════════════════════════════════════ */}
          <div className="flex-1 min-w-0">

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full">
                <Package className="w-3 h-3" /> {product.category}
              </span>
              <StatusBadge status={product.status} />
              {product.units > 0 && (
                <span className="text-xs text-gray-500">{product.units} unit{product.units !== 1 ? 's' : ''} available</span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{product.name}</h1>

            {/* Rating + location */}
            <div className="flex items-center gap-2 mb-6 text-sm text-gray-600 flex-wrap">
              <Stars rating={product.rating} />
              <span className="font-bold text-gray-900">{product.rating}</span>
              <span className="text-gray-300">·</span>
              <span>{product.reviewCount} reviews</span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{product.location}</span>
            </div>

            {/* ── IMAGE CAROUSEL ── */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 mb-4">
              <div className="relative aspect-[4/3] bg-[#f5f0e8]">
                <img
                  key={images[imgIdx]}
                  src={images[imgIdx]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {/* Counter */}
                <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  {imgIdx + 1}/{images.length}
                </div>
                {imgIdx > 0 && (
                  <button
                    onClick={() => setImgIdx(i => i - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:shadow-lg transition"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                )}
                {imgIdx < images.length - 1 && (
                  <button
                    onClick={() => setImgIdx(i => i + 1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:shadow-lg transition"
                  >
                    <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                  </button>
                )}
              </div>
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-28 h-20 rounded-xl overflow-hidden border-2 transition flex-shrink-0 ${
                    i === imgIdx ? 'border-[#1e3a8a]' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* ── ABOUT THIS RENTAL ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
              <h2 className="text-xl font-bold text-gray-900 mb-3">About this rental</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">{product.description}</p>

              <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">What's included</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.included.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* ── SPECIFICATIONS ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Specifications</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {product.specs.map((spec, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <span className="text-sm text-gray-400 sm:w-36 flex-shrink-0">{spec.label}</span>
                    <span className="text-sm font-semibold text-[#1e3a8a]">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RATINGS & REVIEWS ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Ratings &amp; reviews</h2>

              <div className="flex flex-col sm:flex-row gap-6 mb-8">
                {/* Score box */}
                <div className="bg-[#f5f0e8] rounded-2xl p-5 flex flex-col items-center justify-center min-w-[140px]">
                  <div className="text-4xl font-extrabold text-gray-900 mb-1">{product.rating}</div>
                  <Stars rating={product.rating} />
                  <div className="text-xs text-gray-500 mt-2">{product.reviewCount} verified reviews</div>
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Check className="w-3 h-3" /> Renters only
                  </div>
                </div>

                {/* Bar chart */}
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map(star => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
                      <Star className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" />
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${product.ratingBreakdown?.[star] ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8">{product.ratingBreakdown?.[star] ?? 0}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review cards */}
              <div className="space-y-4">
                {product.reviews?.map(review => (
                  <div key={review.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {review.avatar}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{review.name}</div>
                          <Stars rating={review.rating} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{review.date}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{review.text}</p>
                    <button
                      onClick={() => setHelpfulVotes(v => ({ ...v, [review.id]: (v[review.id] ?? review.helpful) + 1 }))}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Helpful · {helpfulVotes[review.id] ?? review.helpful}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
          {/* end left column */}

          {/* ══ RIGHT STICKY BOOKING PANEL ═════════════════════════ */}
          <div className="w-full lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-20">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">

              {/* Price + status */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-2xl font-extrabold text-gray-900">₱{product.price.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">per day · minimum {product.minDays} day{product.minDays !== 1 ? 's' : ''}</div>
                </div>
                <StatusBadge status={product.status} />
              </div>

              {/* Start date */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  min={today}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1e3a8a] transition"
                />
              </div>

              {/* Return date */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">Return Date</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                  min={startDate || today}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1e3a8a] transition"
                />
              </div>

              {/* Damage protection */}
              <div className="border border-gray-200 rounded-xl p-3 mb-4">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={damageProtection}
                    onChange={e => setDamageProtection(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#1e3a8a] cursor-pointer flex-shrink-0"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Add damage protection</div>
                    <div className="text-xs text-gray-400 mt-0.5">Covers accidental damage for ₱250 per rental.</div>
                  </div>
                </label>
              </div>

              {/* Price breakdown */}
              {days > 0 && (
                <div className="bg-[#f5f0e8] rounded-xl p-3 mb-4 text-xs space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>₱{product.price.toLocaleString()} × {days} day{days !== 1 ? 's' : ''}</span>
                    <span>₱{subtotal.toLocaleString()}</span>
                  </div>
                  {damageProtection && (
                    <div className="flex justify-between text-gray-600">
                      <span>Damage protection</span>
                      <span>₱250</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                    <span>Total</span>
                    <span>₱{total.toLocaleString()}</span>
                  </div>
                  {days < product.minDays && (
                    <p className="text-amber-600 font-medium">
                      Minimum rental is {product.minDays} day{product.minDays !== 1 ? 's' : ''}.
                    </p>
                  )}
                </div>
              )}

              {/* Reserve button */}
              <button
                disabled={!canReserve}
                className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl mb-2 transition ${
                  canReserve
                    ? 'bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white'
                    : 'bg-[#e8e0d0] text-gray-400 cursor-not-allowed'
                }`}
              >
                <Calendar className="w-4 h-4" /> Reserve this item
              </button>
              <p className="text-center text-[10px] text-gray-400 leading-relaxed mb-5">
                You won't be charged yet — the supplier confirms availability first.
              </p>

              {/* Trust list */}
              <div className="space-y-2 mb-5">
                {[
                  { Icon: Shield, text: 'Verified supplier, listing reviewed' },
                  { Icon: RotateCcw, text: 'Free cancellation up to 24 hours before' },
                  { Icon: MapPin, text: `Pickup in ${product.location}` },
                  { Icon: Clock, text: `Typical reply in ${product.supplier.replyTime}` },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-gray-600">
                    <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {text}
                  </div>
                ))}
              </div>

              {/* Supplier */}
              <div className="border-t border-gray-100 pt-4">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Supplied by</div>
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={product.supplier.avatar}
                    alt={product.supplier.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                      {product.supplier.name}
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block ml-0.5" />
                    </div>
                    <div className="text-xs text-gray-400">Supplying on Rent-A-Way since {product.supplier.since}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <Stars rating={product.supplier.rating} />
                  <span className="font-semibold text-gray-700">{product.supplier.rating}</span>
                  <span className="text-gray-300">·</span>
                  <Clock className="w-3 h-3" />
                  <span>Replies in {product.supplier.replyTime}</span>
                </div>

                <Link
                  to={`/browse?category=${encodeURIComponent(product.category)}`}
                  className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold py-2.5 rounded-xl mb-2 transition"
                >
                  <Package className="w-3.5 h-3.5" /> More {product.category} listings
                </Link>
                <button className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold py-2.5 rounded-xl mb-3 transition">
                  <MessageSquare className="w-3.5 h-3.5" /> Ask a question
                </button>
                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                  <Shield className="w-3 h-3 inline mr-1 text-gray-300" />
                  This supplier's identity and listing details have been reviewed by our team.
                </p>
              </div>
            </div>
          </div>
          {/* end right column */}

        </div>

        {/* ── YOU MIGHT ALSO NEED ──────────────────────────────── */}
        {related.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-0.5 bg-amber-500" />
              <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">You might also need</span>
            </div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900">
                More {product.category.toLowerCase()} you can rent
              </h2>
              <Link
                to={`/browse?category=${encodeURIComponent(product.category)}`}
                className="flex items-center gap-1 text-sm text-[#1e3a8a] hover:underline font-medium"
              >
                See all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map(rel => (
                <div key={rel.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow group">
                  <div className="relative h-52 bg-[#f5f0e8] overflow-hidden">
                    <img
                      src={rel.images?.[0]}
                      alt={rel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={rel.status} />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{rel.categoryKey}</span>
                      <div className="flex items-center gap-1">
                        <Stars rating={rel.rating} />
                        <span className="text-xs font-semibold text-gray-700">{rel.rating}</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">{rel.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{rel.location}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Min {rel.minDays} day</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-xl font-extrabold text-gray-900">₱{rel.price.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">per day</div>
                      </div>
                      <Link
                        to={`/product/${rel.id}`}
                        className="flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition"
                      >
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}