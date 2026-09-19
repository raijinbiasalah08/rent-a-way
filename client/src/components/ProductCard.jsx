import { Link } from 'react-router-dom';
import CategoryBadge from './CategoryBadge';
import StarRating from './StarRating';

export default function ProductCard({ product }) {
  return (
    <div className="card hover:shadow-md transition group overflow-hidden flex flex-col p-0">
      <div className="h-48 overflow-hidden relative">
        <img src={product.primary_image ? (product.primary_image.startsWith('http') ? product.primary_image : `http://localhost:5000${product.primary_image}`) : 'https://via.placeholder.com/300x200?text=No+Image'} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        <div className="absolute top-3 left-3"><CategoryBadge category={product.category} /></div>
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded text-xs font-bold ${product.availability ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {product.availability ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-lg line-clamp-2 text-navy-700">{product.title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={product.avg_rating || 0} />
            <span className="text-xs text-gray-500">({product.review_count || 0})</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-bold text-lg">₱{product.price_per_day}<span className="text-sm font-normal text-gray-500">/day</span></span>
          <Link to={`/product/${product.id}`} className="btn-primary text-sm px-4 py-2">View Details</Link>
        </div>
      </div>
    </div>
  );
}