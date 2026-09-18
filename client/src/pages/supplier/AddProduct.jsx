import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Plus, AlertTriangle, Check } from 'lucide-react';
import { createProduct, uploadProductImage } from '../../api/products';

const CATEGORIES = [
  'Cameras & Drones',
  'Camping Equipment',
  'Sports Equipment',
  'Event Equipment',
  'Household Equipment',
  'School Project Equipment',
];

const CATEGORY_MAP = {
  'Cameras & Drones': 'Cameras',
  'Camping Equipment': 'Camping',
  'Sports Equipment': 'Sports',
  'Event Equipment': 'Event',
  'Household Equipment': 'Household',
  'School Project Equipment': 'School',
};

export default function AddProduct() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    price_per_day: '',
    min_days: '1',
    max_days: '30',
    location: '',
    specs: '',
  });
  const [images, setImages] = useState([]); // array of File objects
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      setError('You can upload a maximum of 5 images.');
      return;
    }
    setImages(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (i) => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Title is required.');
    if (!form.category) return setError('Please select a category.');
    if (!form.price_per_day || Number(form.price_per_day) <= 0) return setError('Enter a valid price per day.');

    setLoading(true);
    try {
      // 1. Create the product
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: CATEGORY_MAP[form.category] || form.category,
        price_per_day: Number(form.price_per_day),
        min_days: Number(form.min_days) || 1,
        max_days: Number(form.max_days) || 30,
        specs: form.specs.trim(),
      };
      const res = await createProduct(payload);
      const productId = res.data.data.id;

      // 2. Upload images one by one
      for (const file of images) {
        const fd = new FormData();
        fd.append('image', file);
        await uploadProductImage(productId, fd);
      }

      setSuccess(true);
      setTimeout(() => navigate('/supplier/products'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to="/supplier/products" className="text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Add New Listing</h1>
          <p className="text-sm text-gray-500">Fill in the details below to publish your equipment.</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" /> Listing created! Redirecting…
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Listing Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Canon EOS R6 Mirrorless Camera"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition bg-white"
          />
        </div>

        {/* Category + Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={set('category')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition bg-white"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Price per Day (₱) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.price_per_day}
              onChange={set('price_per_day')}
              placeholder="e.g. 1500"
              min="1"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition bg-white"
            />
          </div>
        </div>

        {/* Min/Max days */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Minimum Rental Days</label>
            <input
              type="number"
              value={form.min_days}
              onChange={set('min_days')}
              min="1"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Maximum Rental Days</label>
            <input
              type="number"
              value={form.max_days}
              onChange={set('max_days')}
              min="1"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition bg-white"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={4}
            placeholder="Describe your equipment — condition, what's included, any usage notes…"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition bg-white resize-none"
          />
        </div>

        {/* Specs */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Specs / What's Included <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.specs}
            onChange={set('specs')}
            rows={2}
            placeholder="e.g. 24-70mm lens included, 2 batteries, charger, camera bag"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition bg-white resize-none"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Photos <span className="text-gray-400 font-normal">(up to 5)</span>
          </label>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="flex gap-3 flex-wrap mb-3">
              {previews.map((src, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-[9px] bg-[#1e3a8a] text-white px-1.5 py-0.5 rounded-full font-bold">PRIMARY</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {images.length < 5 && (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-6 px-4 cursor-pointer hover:border-[#1e3a8a] hover:bg-[#1e3a8a]/5 transition">
              <Upload className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-500">
                Click to upload photos <span className="text-[#1e3a8a] font-semibold">({images.length}/5)</span>
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImages}
              />
            </label>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Link
            to="/supplier/products"
            className="flex-1 text-center border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-sm py-3 rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || success}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition"
          >
            {loading ? (
              <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Publishing…</>
            ) : (
              <><Plus className="w-4 h-4" /> Publish Listing</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}