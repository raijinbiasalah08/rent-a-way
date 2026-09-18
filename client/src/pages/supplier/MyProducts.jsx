import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Package, MapPin, Tag, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';

const AVAILABILITY_COLORS = {
  available: 'bg-green-100 text-green-700',
  limited:   'bg-amber-100 text-amber-700',
  rented:    'bg-blue-100 text-blue-700',
};

export default function MyProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState('');

  const fetchProducts = () => {
    setLoading(true);
    api.get('/products/mine')
      .then(res => setProducts(res.data.data || []))
      .catch(() => setError('Failed to load your listings.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      setError('Failed to delete listing. Please try again.');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const toggleAvailability = async (product) => {
    const next = product.availability === 'available' ? 'rented' : 'available';
    try {
      await api.put(`/products/${product.id}`, {
        title: product.title,
        description: product.description,
        category: product.category,
        price_per_day: product.price_per_day,
        min_days: product.min_days,
        max_days: product.max_days,
        specs: product.specs,
        availability: next,
      });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, availability: next } : p));
    } catch {
      setError('Failed to update availability.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My Listings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} listing{products.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/supplier/products/new"
          className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
        >
          <Plus className="w-4 h-4" /> Add New Listing
        </Link>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-[#1e3a8a]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-[#1e3a8a]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No listings yet</h2>
          <p className="text-sm text-gray-500 mb-6">Create your first listing and start earning from your equipment.</p>
          <Link
            to="/supplier/products/new"
            className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold text-sm px-6 py-3 rounded-xl transition"
          >
            <Plus className="w-4 h-4" /> Create First Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition flex flex-col">
              {/* Image */}
              <div className="relative h-44 bg-gray-100 overflow-hidden">
                {product.primary_image ? (
                  <img
                    src={`http://localhost:5000${product.primary_image}`}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                {/* Availability badge */}
                <div className="absolute top-3 left-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${AVAILABILITY_COLORS[product.availability] || 'bg-gray-100 text-gray-600'}`}>
                    {product.availability}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">{product.title}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <Tag className="w-3 h-3" />
                  <span>{product.category}</span>
                </div>
                <div className="text-lg font-extrabold text-gray-900 mb-1">
                  ₱{Number(product.price_per_day).toLocaleString()}<span className="text-xs font-normal text-gray-400"> /day</span>
                </div>
                <p className="text-xs text-gray-400 mb-4">Min {product.min_days} day{product.min_days !== 1 ? 's' : ''}</p>

                {/* Toggle availability */}
                <button
                  onClick={() => toggleAvailability(product)}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 mb-4 transition"
                >
                  {product.availability === 'available'
                    ? <ToggleRight className="w-4 h-4 text-green-500" />
                    : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                  {product.availability === 'available' ? 'Listed as available' : 'Listed as unavailable'}
                </button>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <Link
                    to={`/supplier/products/${product.id}/edit`}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 hover:border-[#1e3a8a] hover:text-[#1e3a8a] text-gray-600 text-xs font-semibold py-2 rounded-lg transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Link>
                  {confirmId === product.id ? (
                    <div className="flex-1 flex gap-1">
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 rounded-lg transition disabled:opacity-60"
                      >
                        {deletingId === product.id ? '…' : 'Yes, delete'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold py-2 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(product.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold py-2 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}