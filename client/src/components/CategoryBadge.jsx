export default function CategoryBadge({ category }) {
  const colors = {
    Cameras: 'bg-purple-100 text-purple-800',
    Camping: 'bg-green-100 text-green-800',
    Sports: 'bg-orange-100 text-orange-800',
    Event: 'bg-pink-100 text-pink-800',
    Household: 'bg-blue-100 text-blue-800',
    School: 'bg-yellow-100 text-yellow-800'
  };
  return <span className={`badge ${colors[category] || 'bg-gray-100 text-gray-800'}`}>{category}</span>;
}