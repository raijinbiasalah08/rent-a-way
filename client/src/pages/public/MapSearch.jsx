import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Filter, Star, Navigation, MapPin } from 'lucide-react';
import { getProducts } from '../../api/products';
import LoadingSpinner from '../../components/LoadingSpinner';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BASE_URL = 'http://localhost:5000';

// A component to capture map bounds when moved
function MapEventTracker({ setBounds }) {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      const bounds = map.getBounds();
      setBounds({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
      });
    }
  });
  return null;
}

export default function MapSearch() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bounds, setBounds] = useState(null);
  
  // Metro Manila center
  const center = [14.5547, 121.0244]; 

  useEffect(() => {
    // Only fetch if bounds exist (after initial render and map load)
    if (!bounds) return;

    setLoading(true);
    
    // We pass limits up to 50 for map markers
    const query = {
      limit: 50,
      minLat: bounds.minLat,
      maxLat: bounds.maxLat,
      minLng: bounds.minLng,
      maxLng: bounds.maxLng
    };
    
    if (initialCategory) query.category = initialCategory;

    getProducts(query)
      .then(res => setProducts(res.data.data.products))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bounds, initialCategory]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Top Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/browse" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
            <Filter className="w-4 h-4" /> Switch to List View
          </Link>
          <span className="text-gray-500 text-sm">
            {loading ? 'Searching area...' : `${products.length} items found in this area`}
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Side: Scrollable Cards (Hidden on very small mobile) */}
        <div className="w-full md:w-[450px] lg:w-[500px] bg-[#fcfbfa] flex-shrink-0 flex flex-col h-full border-r border-gray-200 z-10 absolute md:relative top-0 left-0 bottom-0 pointer-events-none md:pointer-events-auto transition-transform">
          <div className="p-4 flex-1 overflow-y-auto pointer-events-auto h-full">
            <h1 className="text-xl font-extrabold text-gray-900 mb-4 px-2">Map Search {initialCategory ? `· ${initialCategory}` : ''}</h1>
            
            {loading && !products.length ? (
              <div className="flex justify-center p-8"><LoadingSpinner /></div>
            ) : products.length === 0 ? (
              <div className="text-center p-12 text-gray-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No items found in this map area.</p>
                <p className="text-xs mt-1">Try zooming out or moving the map.</p>
              </div>
            ) : (
              <div className="space-y-4 px-1">
                {products.map(product => {
                  const img = product.primary_image ? (product.primary_image.startsWith('http') ? product.primary_image : `${BASE_URL}${product.primary_image}`) : 'https://placehold.co/400x300/1e3a8a/ffffff?text=Product';
                  return (
                    <Link to={`/product/${product.id}`} key={product.id} className="bg-white rounded-2xl p-3 flex gap-4 border border-gray-100 hover:shadow-lg transition group">
                      <div className="w-32 h-28 bg-[#f5f0e8] rounded-xl flex-shrink-0 overflow-hidden relative">
                        <img src={img} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">{product.category}</div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 leading-snug">{product.title}</h3>
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-semibold text-gray-700">{Number(product.avg_rating || 0).toFixed(1)}</span>
                        </div>
                        <div className="mt-auto flex items-end justify-between">
                          <div>
                            <span className="text-lg font-extrabold text-[#1e3a8a]">₱{product.price_per_day.toLocaleString()}</span>
                            <span className="text-xs text-gray-400 font-medium"> /day</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Leaflet Map */}
        <div className="flex-1 h-full z-0 relative bg-gray-100">
          <MapContainer 
            center={center} 
            zoom={12} 
            style={{ width: '100%', height: '100%' }}
            whenReady={(e) => {
              // Trigger initial bounds fetch
              const map = e.target;
              const b = map.getBounds();
              setBounds({
                minLat: b.getSouth(),
                maxLat: b.getNorth(),
                minLng: b.getWest(),
                maxLng: b.getEast(),
              });
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <MapEventTracker setBounds={setBounds} />
            
            {products.map(product => {
              if (!product.latitude || !product.longitude) return null;
              return (
                <Marker key={product.id} position={[product.latitude, product.longitude]}>
                  <Popup className="rounded-xl overflow-hidden">
                    <div className="w-48 pb-1">
                      <img src={product.primary_image ? (product.primary_image.startsWith('http') ? product.primary_image : `${BASE_URL}${product.primary_image}`) : 'https://placehold.co/400x300'} className="w-full h-24 object-cover mb-2" />
                      <h4 className="font-bold text-gray-900 text-sm mb-1 leading-tight line-clamp-1">{product.title}</h4>
                      <div className="text-xs text-[#1e3a8a] font-bold mb-2">₱{product.price_per_day.toLocaleString()} / day</div>
                      <Link to={`/product/${product.id}`} className="block w-full bg-[#1e3a8a] text-white text-center py-1.5 rounded-lg text-xs font-semibold">View Item</Link>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

          </MapContainer>
        </div>

      </div>
    </div>
  );
}
