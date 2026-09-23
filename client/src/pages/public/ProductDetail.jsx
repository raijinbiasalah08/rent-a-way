import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon,
  MapPin, Calendar, Shield, RotateCcw, Clock,
  ThumbsUp, Star, Check, ArrowRight, Package,
  MessageSquare, X, Send, Image, Navigation
} from 'lucide-react';
import { getProduct, getProducts, submitReview } from '../../api/products';
import { sendMessage } from '../../api/messages';
import { useAuth } from '../../context/AuthContext';
import { useCustomerLocation } from '../../context/CustomerLocationContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ROXAS_BOUNDS, formatRoxasAddress } from '../../utils/roxasLocation';

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

const BASE_URL = 'http://localhost:5000';

import { Helmet } from 'react-helmet-async';

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customerCoords, hasLocation, detecting, requestCustomerLocation, getItemDistance } = useCustomerLocation();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  const [imgIdx, setImgIdx] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [damageProtection, setDamageProtection] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState({});
  
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContent, setMessageContent] = useState('');

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImage, setReviewImage] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProduct(id)
      .then(res => {
        setProduct(res.data.data);
        return getProducts({ category: res.data.data.category, limit: 3 });
      })
      .then(res => {
        // filter out current product
        setRelated((res.data?.data?.products || []).filter(p => p.id !== id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    setImgIdx(0);
    setStartDate('');
    setReturnDate('');
    setDamageProtection(false);
    setHelpfulVotes({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (!product) {
    return <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">Product not found</div>;
  }

  const images = product.images?.length > 0 
    ? product.images.map(img => img.url.startsWith('http') ? img.url : `${BASE_URL}${img.url}`) 
    : ['https://placehold.co/600x400/1e3a8a/ffffff?text=Product'];

  /* ── Date / pricing logic ── */
  const today = new Date().toISOString().split('T')[0];
  const days = startDate && returnDate
    ? Math.max(1, Math.ceil((new Date(returnDate) - new Date(startDate)) / 86400000))
    : 0;
  const subtotal = days * (product.price_per_day || 0);
  const protectionFee = damageProtection ? 250 : 0;
  const total = subtotal + protectionFee;
  const canReserve = days >= (product.min_days || 1);

  const handleReserve = () => {
    navigate(`/customer/checkout?product_id=${product.id}&start_date=${startDate}&end_date=${returnDate}&protection=${damageProtection}`);
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast.error('Please log in to send a message.');
      navigate('/login');
      return;
    }
    if (!messageContent.trim()) return;

    try {
      await sendMessage({
        receiver_id: product.supplier_id,
        content: messageContent,
        product_id: product.id
      });
      toast.success('Message sent!');
      setShowMessageModal(false);
      setMessageContent('');
      navigate('/messages');
    } catch (err) {
      toast.error('Failed to send message.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return toast.error('Please enter a comment');
    
    setSubmittingReview(true);
    try {
      const formData = new FormData();
      formData.append('product_id', product.id);
      formData.append('rating', reviewRating);
      formData.append('comment', reviewComment);
      if (reviewImage) formData.append('image', reviewImage);

      await submitReview(formData);
      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      setReviewComment('');
      setReviewImage(null);
      setReviewRating(5);
      
      // Reload product to show new review
      const res = await getProduct(id);
      setProduct(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const parsedSpecs = [];
  try {
    const sp = JSON.parse(product.specs || '[]');
    sp.forEach(s => parsedSpecs.push(s));
  } catch (e) {
    if (product.specs) parsedSpecs.push({ label: 'Details', value: product.specs });
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-sans">
      <Helmet>
        <title>{product.title} | Rent-A-Way</title>
        <meta name="description" content={product.description?.substring(0, 160) || 'Rent this item on Rent-A-Way.'} />
        {images.length > 0 && <meta property="og:image" content={images[0]} />}
      </Helmet>

      {/* ── BREADCRUMB ──────────────────────────────────────────── */}
      <div className="bg-[#f5f0e8] border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
          <Link to="/" className="text-[#1e3a8a] hover:underline">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/browse" className="text-[#1e3a8a] hover:underline">Browse</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={`/browse?category=${encodeURIComponent(product.category)}`} className="text-[#1e3a8a] hover:underline">{product.category}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-700 truncate max-w-[240px]">{product.title}</span>
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
              <StatusBadge status={product.availability || 'available'} />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{product.title}</h1>

            {/* Rating + location */}
            <div className="flex items-center gap-2 mb-6 text-sm text-gray-600 flex-wrap">
              <Stars rating={product.avg_rating || 0} />
              <span className="font-bold text-gray-900">{Number(product.avg_rating || 0).toFixed(1)}</span>
              <span className="text-gray-300">·</span>
              <span>{product.review_count || 0} reviews</span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5 flex-wrap" title={product.barangay ? `Brgy. ${product.barangay}, Roxas, Oriental Mindoro` : (product.location || 'Roxas, Oriental Mindoro')}>
                <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span className="truncate max-w-[240px] font-medium text-gray-700">
                  {product.barangay ? `Brgy. ${product.barangay}, Roxas, Oriental Mindoro` : (product.location || 'Roxas, Oriental Mindoro')}
                </span>
                {getItemDistance(product.latitude, product.longitude) && (
                  <span className="bg-blue-100 text-[#1e3a8a] text-xs px-2 py-0.5 rounded-full font-bold ml-1 flex items-center gap-1">
                    <Navigation className="w-2.5 h-2.5" />
                    {getItemDistance(product.latitude, product.longitude)}
                  </span>
                )}
              </span>
            </div>

            {/* ── IMAGE CAROUSEL ── */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 mb-4">
              <div className="relative aspect-[4/3] bg-[#f5f0e8]">
                <img
                  key={images[imgIdx]}
                  src={images[imgIdx]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
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
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>

            {/* ── SPECIFICATIONS ── */}
            {parsedSpecs.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Specifications</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {parsedSpecs.map((spec, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="text-sm text-gray-400 sm:w-36 flex-shrink-0">{spec.label || spec.name}</span>
                      <span className="text-sm font-semibold text-[#1e3a8a]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PICKUP & LISTER LOCATION ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-500" /> Pickup &amp; Lister Location
                </h2>
                {product.latitude && product.longitude && (
                  <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Exact GPS Pinpoint
                  </span>
                )}
              </div>
              
              <p className="text-sm font-medium text-gray-800 mb-3 flex items-start gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>
                  {product.barangay
                    ? formatRoxasAddress(product.barangay, product.supplier_address || product.location)
                    : (product.location || 'Roxas, Oriental Mindoro')}
                </span>
              </p>

              {/* Customer Distance Badge */}
              {getItemDistance(product.latitude, product.longitude) ? (
                <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 px-3.5 py-2 rounded-xl mb-4 text-xs text-[#1e3a8a]">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" /> Distance from your location:
                  </span>
                  <span className="font-extrabold text-xs bg-white text-[#1e3a8a] px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs">
                    {getItemDistance(product.latitude, product.longitude)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-50 border border-gray-100 px-3.5 py-2 rounded-xl mb-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-gray-400" /> Want to know how far this item is?
                  </span>
                  <button
                    onClick={() => requestCustomerLocation(false)}
                    disabled={detecting}
                    className="text-[#1e3a8a] font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {detecting ? 'Detecting…' : 'Calculate Distance'}
                  </button>
                </div>
              )}

              {product.latitude && product.longitude ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-xs relative">
                  <div className="h-56 w-full">
                    <MapContainer
                      center={[product.latitude, product.longitude]}
                      zoom={15}
                      minZoom={12}
                      maxZoom={18}
                      maxBounds={ROXAS_BOUNDS}
                      maxBoundsViscosity={1.0}
                      scrollWheelZoom={false}
                      style={{ height: '100%', width: '100%', zIndex: 1 }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[product.latitude, product.longitude]}>
                        <Popup>
                          <div className="p-1 font-sans text-xs">
                            <p className="font-bold text-gray-900">{product.title}</p>
                            <p className="text-gray-600 mt-0.5">
                              {product.barangay ? `Brgy. ${product.barangay}, Roxas, Oriental Mindoro` : (product.location || 'Roxas, Oriental Mindoro')}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <span className="text-gray-500">
                      Coordinates: <strong className="font-mono text-gray-800">{Number(product.latitude).toFixed(5)}, {Number(product.longitude).toFixed(5)}</strong>
                    </span>
                    <Link
                      to="/map"
                      className="text-[#1e3a8a] font-semibold hover:underline flex items-center gap-1"
                    >
                      Open interactive map <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Coordinates pending verification by supplier. Exact meetup details shared after booking.
                </div>
              )}
            </div>

            {/* ── RATINGS & REVIEWS ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Ratings &amp; reviews</h2>
              
              <div className="flex flex-col sm:flex-row gap-6 mb-8">
                <div className="bg-[#f5f0e8] rounded-2xl p-5 flex flex-col items-center justify-center min-w-[140px]">
                  <div className="text-4xl font-extrabold text-gray-900 mb-1">{Number(product.avg_rating || 0).toFixed(1)}</div>
                  <Stars rating={product.avg_rating || 0} />
                  <div className="text-xs text-gray-500 mt-2">{product.review_count || 0} verified reviews</div>
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Check className="w-3 h-3" /> Renters only
                  </div>
                </div>
                
                {user && user.role === 'customer' && (
                  <div className="flex flex-col justify-center">
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="bg-white border border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
                    >
                      Write a Review
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">You can only review if you have rented this item.</p>
                  </div>
                )}
              </div>

              {/* Review cards */}
              <div className="space-y-4">
                {(!product.reviews || product.reviews.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No reviews yet for this product.</p>
                )}
                {product.reviews?.map(review => (
                  <div key={review.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {review.avatar ? (
                          <img src={review.avatar?.startsWith('http') ? review.avatar : `${BASE_URL}${review.avatar}`} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt={review.name} />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            {review.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{review.name}</div>
                          <Stars rating={review.rating} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(review.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{review.text}</p>
                    
                    {review.image_url && (
                      <div className="mb-3">
                        <img 
                          src={`${BASE_URL}${review.image_url}`} 
                          alt="Review attachment" 
                          className="h-32 w-auto object-cover rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition"
                          onClick={() => window.open(`${BASE_URL}${review.image_url}`, '_blank')}
                        />
                      </div>
                    )}
                    <button
                      onClick={() => setHelpfulVotes(v => ({ ...v, [review.id]: (v[review.id] ?? 0) + 1 }))}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      Helpful · {helpfulVotes[review.id] ?? 0}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ══ RIGHT STICKY BOOKING PANEL ═════════════════════════ */}
          <div className="w-full lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-20">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-2xl font-extrabold text-gray-900">₱{product.price_per_day.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">per day · minimum {product.min_days} day{product.min_days !== 1 ? 's' : ''}</div>
                </div>
                <StatusBadge status={product.availability || 'available'} />
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">Select Dates</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden flex">
                  <DatePicker
                    selected={startDate ? new Date(startDate) : null}
                    onChange={(dates) => {
                      const [start, end] = dates;
                      setStartDate(start ? start.toISOString().split('T')[0] : '');
                      setReturnDate(end ? end.toISOString().split('T')[0] : '');
                    }}
                    startDate={startDate ? new Date(startDate) : null}
                    endDate={returnDate ? new Date(returnDate) : null}
                    selectsRange
                    minDate={new Date()}
                    placeholderText="Select start and return dates"
                    className="w-full px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1e3a8a] transition"
                  />
                </div>
              </div>

              <div className="mb-4 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="protection" 
                  checked={damageProtection}
                  onChange={(e) => setDamageProtection(e.target.checked)}
                  className="w-4 h-4 text-[#1e3a8a] border-gray-300 rounded focus:ring-[#1e3a8a]"
                />
                <label htmlFor="protection" className="text-sm flex items-center gap-1 text-gray-700">
                  <Shield className="w-3.5 h-3.5 text-green-600" /> Damage Protection (+₱250)
                </label>
              </div>

              {days > 0 && (
                <div className="bg-[#f5f0e8] rounded-xl p-3 mb-4 text-xs space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>₱{product.price_per_day.toLocaleString()} × {days} day{days !== 1 ? 's' : ''}</span>
                    <span>₱{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                    <span>Total</span>
                    <span>₱{total.toLocaleString()}</span>
                  </div>
                  {days < product.min_days && (
                    <p className="text-amber-600 font-medium mt-2">
                      Minimum rental is {product.min_days} day{product.min_days !== 1 ? 's' : ''}.
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleReserve}
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
                You will review the details before confirming.
              </p>

              <div className="border-t border-gray-100 pt-4">
                <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Supplied by</div>
                <div className="flex items-center gap-3 mb-2">
                  {product.supplier_avatar ? (
                    <img src={product.supplier_avatar?.startsWith('http') ? product.supplier_avatar : `${BASE_URL}${product.supplier_avatar}`} alt={product.supplier_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold flex-shrink-0">
                      {product.supplier_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                      {product.supplier_name}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                      <span className="truncate max-w-[170px]">
                        {product.barangay ? `Brgy. ${product.barangay}, Roxas` : (product.location || product.supplier_address || 'Roxas, Oriental Mindoro')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 mb-2">
                  <Link
                    to={`/browse?category=${encodeURIComponent(product.category)}`}
                    className="flex items-center justify-center gap-2 border border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 text-xs font-semibold py-2.5 rounded-xl transition"
                  >
                    <Package className="w-3.5 h-3.5" /> More items
                  </Link>
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold py-2.5 rounded-xl transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── YOU MIGHT ALSO NEED ──────────────────────────────── */}
        {related.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-0.5 bg-amber-500" />
              <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">You might also like</span>
            </div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900">
                More {product.category.toLowerCase()}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map(rel => {
                const img = rel.primary_image ? (rel.primary_image.startsWith('http') ? rel.primary_image : `${BASE_URL}${rel.primary_image}`) : 'https://placehold.co/500x400/1e3a8a/ffffff?text=Product';
                return (
                  <div key={rel.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow group flex flex-col">
                    <div className="relative h-52 bg-[#f5f0e8] overflow-hidden">
                      <img src={img} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-3 left-3">
                        <StatusBadge status={rel.availability || 'available'} />
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{rel.category}</span>
                        <div className="flex items-center gap-1">
                          <Stars rating={rel.avg_rating || 0} />
                          <span className="text-xs font-semibold text-gray-700">{Number(rel.avg_rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">{rel.title}</h3>
                      <div className="flex items-end justify-between mt-auto pt-2">
                        <div>
                          <div className="text-xl font-extrabold text-gray-900">₱{Number(rel.price_per_day || 0).toLocaleString()}</div>
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
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MESSAGE SUPPLIER MODAL ── */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Message {product.supplier_name}</h2>
              <button onClick={() => setShowMessageModal(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-gray-50 flex items-center gap-3 border-b border-gray-100">
              <img src={images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <div>
                <div className="text-sm font-bold text-gray-900 line-clamp-1">{product.title}</div>
                <div className="text-xs text-gray-500">Regarding this item</div>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Hi, I have a question about this item..."
                className="w-full h-32 border border-gray-200 rounded-xl p-3 text-sm resize-none outline-none focus:border-[#1e3a8a] transition"
              />
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowMessageModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageContent.trim()}
                className="flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition"
              >
                Send Message <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW MODAL ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Write a Review</h2>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleReviewSubmit} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReviewRating(i)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <svg className={`w-8 h-8 ${i <= reviewRating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Your Review</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this item..."
                  className="w-full h-32 border border-gray-200 rounded-xl p-3 text-sm resize-none outline-none focus:border-[#1e3a8a] transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Add a Photo (optional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center justify-center w-12 h-12 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#1e3a8a] hover:bg-blue-50 transition">
                    <Image className="w-5 h-5 text-gray-400" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => setReviewImage(e.target.files[0])} 
                    />
                  </label>
                  {reviewImage && (
                    <div className="text-sm text-gray-600 truncate max-w-[200px]">
                      {reviewImage.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition"
                >
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}