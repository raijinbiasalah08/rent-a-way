import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, X, Save, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { getProduct, updateProduct, uploadProductImage } from '../../api/products';
import api from '../../api/axios';
import LocationPicker from '../../components/LocationPicker';

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

// Reverse map: server value → display label
const CATEGORY_REVERSE = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([k, v]) => [v, k])
);

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    price_per_day: '',
    min_days: '1',
    max_days: '30',
    specs: '',
    availability: 'available',
    location: '',
    barangay: '',
    latitude: null,
    longitude: null,
  });
  const [existingImages, setExistingImages] = useState([]); // { id, url, is_primary }
  const [newImages, setNewImages] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  useEffect(() => {
    getProduct(id)
      .then(res => {
        const p = res.data.data;
        setForm({
          title: p.title || '',
          category: CATEGORY_REVERSE[p.category] || p.category || '',
          description: p.description || '',
          price_per_day: p.price_per_day || '',
          min_days: p.min_days || '1',
          max_days: p.max_days || '30',
          specs: p.specs || '',
          availability: p.availability || 'available',
          location: p.location || '',
          barangay: p.barangay || '',
          latitude: p.latitude || null,
          longitude: p.longitude || null,
        });
        setExistingImages(p.images || []);
      })
      .catch(() => setError('Failed to load listing details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleNewImages = (e) => {
    const files = Array.from(e.target.files);
    const total = existingImages.length + newImages.length + files.length;
    if (total > 5) {
      setError('Maximum 5 images total.');
      return;
    }
    setNewImages(prev => [...prev, ...files]);
    setNewPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeNewImage = (i) => {
    setNewImages(prev => prev.filter((_, idx) => idx !== i));
    setNewPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const deleteExistingImage = async (imageId) => {
    try {
      await api.delete(`/products/${id}/images/${imageId}`);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    } catch {
      setError('Failed to remove image.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Title is required.');
    if (!form.category) return setError('Please select a category.');
    if (!form.price_per_day || Number(form.price_per_day) <= 0) return setError('Enter a valid price per day.');

    setSaving(true);
    try {
      // 1. Update product fields
      await updateProduct(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: CATEGORY_MAP[form.category] || form.category,
        price_per_day: Number(form.price_per_day),
        min_days: Number(form.min_days) || 1,
        max_days: Number(form.max_days) || 30,
        specs: form.specs.trim(),
        availability: form.availability,
        location: form.location.trim(),
        barangay: form.barangay?.trim() || '',
        latitude: form.latitude,
        longitude: form.longitude,
      });

      // 2. Upload new images
      for (const file of newImages) {
        const fd = new FormData();
        fd.append('image', file);
        await uploadProductImage(id, fd);
      }

      setSuccess(true);
      setTimeout(() => navigate('/supplier/products'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update listing.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to="/supplier/products" className="text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Edit Listing</h1>
          <p className="text-sm text-gray-500">Update your equipment details below.</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}
      {success && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" /> Listing updated! Redirecting…
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

        {/* Min/Max days + Availability */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min Days</label>
            <input
              type="number"
              value={form.min_days}
              onChange={set('min_days')}
              min="1"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Days</label>
            <input
              type="number"
              value={form.max_days}
              onChange={set('max_days')}
              min="1"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Availability</label>
            <select
              value={form.availability}
              onChange={set('availability')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10 transition bg-white"
            >
              <option value="available">Available</option>
              <option value="limited">Limited</option>
              <option value="rented">Rented out</option>
            </select>
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

        {/* Location Picker */}
        <div className="bg-gray-50/70 p-4 sm:p-5 rounded-2xl border border-gray-200">
          <LocationPicker
            location={form.location}
            barangay={form.barangay}
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={({ location, barangay, latitude, longitude }) => {
              setForm(prev => ({
                ...prev,
                location,
                barangay,
                latitude,
                longitude
              }));
            }}
          />
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Photos <span className="text-gray-400 font-normal">({existingImages.length + newImages.length}/5)</span>
          </label>

          <div className="flex gap-3 flex-wrap mb-3">
            {/* Existing images */}
            {existingImages.map((img, i) => (
              <div key={img.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                <img src={`http://localhost:5000${img.url}`} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => deleteExistingImage(img.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition"
                >
                  <X className="w-3 h-3" />
                </button>
                {img.is_primary === 1 && (
                  <span className="absolute bottom-1 left-1 text-[9px] bg-[#1e3a8a] text-white px-1.5 py-0.5 rounded-full font-bold">PRIMARY</span>
                )}
              </div>
            ))}

            {/* New image previews */}
            {newPreviews.map((src, i) => (
              <div key={`new-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-dashed border-[#1e3a8a]/40 flex-shrink-0">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition"
                >
                  <X className="w-3 h-3" />
                </button>
                <span className="absolute bottom-1 left-1 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span>
              </div>
            ))}
          </div>

          {/* Upload button */}
          {existingImages.length + newImages.length < 5 && (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-5 px-4 cursor-pointer hover:border-[#1e3a8a] hover:bg-[#1e3a8a]/5 transition">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Click to add more photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleNewImages}
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
            disabled={saving || success}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition"
          >
            {saving ? (
              <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Saving…</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}