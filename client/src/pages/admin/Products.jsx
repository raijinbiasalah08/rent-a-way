import { useState, useEffect } from 'react';
import { getAdminProducts, toggleProduct } from '../../api/admin';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const BASE_URL = 'http://localhost:5000';

const CATEGORY_COLORS = {
  Cameras: 'bg-purple-100 text-purple-700',
  Camping: 'bg-green-100 text-green-700',
  Sports: 'bg-orange-100 text-orange-700',
  Event: 'bg-pink-100 text-pink-700',
  Household: 'bg-blue-100 text-blue-700',
  School: 'bg-yellow-100 text-yellow-700',
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = () => {
    setLoading(true);
    getAdminProducts()
      .then(res => setProducts(res.data?.data || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleToggle = async (product) => {
    try {
      await toggleProduct(product.id);
      toast.success(`Product ${product.is_active ? 'deactivated' : 'activated'}`);
      fetchProducts();
    } catch {
      toast.error('Failed to update product');
    }
  };

  const filtered = products.filter(p =>
    !search ||
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Manage Products</h1>

      <div className="card overflow-x-auto">
        <div className="mb-5">
          <input
            type="text"
            placeholder="Search by title or supplier..."
            className="input max-w-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No products found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Supplier</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Price/Day</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-cream-50 transition">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.primary_image ? (p.primary_image.startsWith('http') ? p.primary_image : `${BASE_URL}${p.primary_image}`) : `https://placehold.co/40x40/1a237e/f5f0dc?text=${encodeURIComponent(p.title?.[0] || 'P')}`}
                        alt={p.title}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        onError={e => { e.target.src = 'https://placehold.co/40x40/1a237e/f5f0dc?text=P'; }}
                      />
                      <span className="font-medium text-navy-700 whitespace-nowrap">{p.title}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-600 whitespace-nowrap">{p.supplier_name}</td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[p.category] || 'bg-gray-100 text-gray-700'}`}>
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-navy-700">₱{p.price_per_day?.toLocaleString()}</td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleToggle(p)}
                      className={`text-xs font-semibold hover:underline ${p.is_active ? 'text-red-500' : 'text-green-600'}`}
                    >
                      {p.is_active ? 'Deactivate Listing' : 'Activate Listing'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 text-xs text-gray-400">{filtered.length} product(s)</div>
      </div>
    </div>
  );
}