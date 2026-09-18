import { Star } from 'lucide-react';
export default function StarRating({ rating, interactive, onRate }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(star => (
        <Star key={star} size={16}
          className={`${star <= Math.round(rating) ? 'text-gold fill-gold' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:scale-110 transition' : ''}`}
          onClick={() => interactive && onRate && onRate(star)}
        />
      ))}
    </div>
  );
}