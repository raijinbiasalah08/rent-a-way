import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites } from '../../api/favorites';
import { ArrowRight, Star, MapPin, Calendar, Heart } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFavorites } from '../../context/FavoritesContext';

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

function ProductCard({ product }) {
  const { toggleFavorite } = useFavorites();
  const image = product.primary_image ? (product.primary_image.startsWith('http') ? product.primary_image : `http://localhost:5000${product.primary_image}`) : 'https://placehold.co/500x400/1e3a8a/ffffff?text=Product';
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow group flex flex-col">
      <div className="relative h-52 bg-[#f5f0e8] overflow-hidden">
        <img src={image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-3 left-3">
          <StatusBadge status={product.availability || 'available'} />
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.product_id); }}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition"
        >
          <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{product.category}</span>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span className="text-xs font-semibold text-gray-700">{Number(product.avg_rating || 0).toFixed(1)}</span>
          </div>
        </div>
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1.5 line-clamp-2">{product.title}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 mt-auto">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Philippines</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Min {product.min_days || 1} day</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl font-extrabold text-gray-900">₱{Number(product.price_per_day || 0).toLocaleString()}</div>
            <div className="text-xs text-gray-400">per day</div>
          </div>
          <Link to={`/product/${product.product_id}`} className="flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition">
            View <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { favoriteIds } = useFavorites();

  useEffect(() => {
    getFavorites()
      .then(res => setFavorites(res.data.data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [favoriteIds]); // Refetch if un-favorited

  return (
    <div className="min-h-screen bg-[#f5f0e8] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">My Favorites</h1>
        <p className="text-sm text-gray-500 mb-8">Items you have saved for later.</p>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : favorites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No favorites yet</h2>
            <p className="text-sm text-gray-500 max-w-sm mb-6">Start browsing and click the heart icon to save your favorite equipment.</p>
            <Link to="/browse" className="bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-semibold px-6 py-3 rounded-xl transition">
              Browse Equipment
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {favorites.map(fav => (
              <ProductCard key={fav.product_id} product={fav} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
