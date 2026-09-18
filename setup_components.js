const fs = require('fs');
const path = require('path');
const clientDir = path.join(__dirname, 'client');

const files = {
  'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);`,
  'src/App.jsx': `import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/public/Home';
import Browse from './pages/public/Browse';
import ProductDetail from './pages/public/ProductDetail';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';

import CustomerDashboard from './pages/customer/Dashboard';
import CustomerRentals from './pages/customer/MyRentals';
import CustomerBooking from './pages/customer/Booking';
import CustomerProfile from './pages/customer/Profile';
import CustomerCommunity from './pages/customer/Community';

import SupplierDashboard from './pages/supplier/Dashboard';
import SupplierProducts from './pages/supplier/MyProducts';
import AddProduct from './pages/supplier/AddProduct';
import EditProduct from './pages/supplier/EditProduct';
import RentalRequests from './pages/supplier/RentalRequests';

import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProducts from './pages/admin/Products';
import AdminRentals from './pages/admin/Rentals';
import AdminPayments from './pages/admin/Payments';
import AdminComplaints from './pages/admin/Complaints';
import AdminReports from './pages/admin/Reports';

const NotFound = () => <div className="text-center p-20"><h1>404 Not Found</h1><a href="/" className="btn-primary mt-4 inline-block">Back Home</a></div>;

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/customer/*" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <Routes>
                <Route path="dashboard" element={<CustomerDashboard />} />
                <Route path="rentals" element={<CustomerRentals />} />
                <Route path="booking/:productId" element={<CustomerBooking />} />
                <Route path="profile" element={<CustomerProfile />} />
                <Route path="community" element={<CustomerCommunity />} />
              </Routes>
            </ProtectedRoute>
          } />

          <Route path="/supplier/*" element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <Routes>
                <Route path="dashboard" element={<SupplierDashboard />} />
                <Route path="products" element={<SupplierProducts />} />
                <Route path="products/new" element={<AddProduct />} />
                <Route path="products/:id/edit" element={<EditProduct />} />
                <Route path="rentals" element={<RentalRequests />} />
              </Routes>
            </ProtectedRoute>
          } />

          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="rentals" element={<AdminRentals />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="complaints" element={<AdminComplaints />} />
                <Route path="reports" element={<AdminReports />} />
              </Routes>
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
export default App;`,
  'src/components/Navbar.jsx': `import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  const getLinks = () => {
    if (!user) return [{ to: '/browse', label: 'Browse' }, { to: '/login', label: 'Login' }, { to: '/register', label: 'Register' }];
    if (user.role === 'customer') return [{ to: '/browse', label: 'Browse' }, { to: '/customer/rentals', label: 'My Rentals' }, { to: '/customer/community', label: 'Community' }, { to: '/customer/profile', label: 'Profile' }];
    if (user.role === 'supplier') return [{ to: '/supplier/products', label: 'My Products' }, { to: '/supplier/rentals', label: 'Rental Requests' }];
    if (user.role === 'admin') return [{ to: '/admin/dashboard', label: 'Dashboard' }, { to: '/admin/users', label: 'Users' }, { to: '/admin/products', label: 'Products' }, { to: '/admin/rentals', label: 'Rentals' }, { to: '/admin/reports', label: 'Reports' }];
    return [];
  };

  return (
    <nav className="bg-navy-700 text-cream-200 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={user ? \`/\${user.role}/dashboard\` : '/'} className="flex items-center gap-2">
            <img src="/logo.png" alt="RentAway Logo" className="h-8 w-8" />
            <span className="font-bold text-xl tracking-tight">RentAway</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            {getLinks().map(l => (
              <Link key={l.to} to={l.to} className={\`hover:text-white transition \${pathname.startsWith(l.to) ? 'border-b-2 border-cream-200' : ''}\`}>{l.label}</Link>
            ))}
            {user && <button onClick={logout} className="hover:text-white">Logout</button>}
          </div>
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>{isOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {getLinks().map(l => (
            <Link key={l.to} to={l.to} className="block px-3 py-2 rounded-md hover:bg-navy-600 hover:text-white">{l.label}</Link>
          ))}
          {user && <button onClick={logout} className="block w-full text-left px-3 py-2 rounded-md hover:bg-navy-600 hover:text-white">Logout</button>}
        </div>
      )}
    </nav>
  );
}`,
  'src/components/Footer.jsx': `export default function Footer() {
  return (
    <footer className="bg-navy-700 text-cream-200 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="RentAway Logo" className="h-6 w-6" />
            <span className="font-bold text-lg">RentAway</span>
          </div>
          <p className="text-sm">Find Better Ways to Save.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-4 text-white">Links</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/browse" className="hover:text-white">Browse</a></li>
            <li><a href="#" className="hover:text-white">How It Works</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4 text-white">Categories</h4>
          <ul className="space-y-2 text-sm">
            <li>Cameras</li>
            <li>Camping</li>
            <li>Sports</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4 text-white">Contact</h4>
          <p className="text-sm">support@rentaway.com<br/>+63 917 123 4567</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-navy-600 text-sm text-center">
        © 2024 RentAway. Find Better Ways to Save.
      </div>
    </footer>
  );
}`,
  'src/components/ProtectedRoute.jsx': `import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={\`/\${user.role}/dashboard\`} replace />;
  return children;
}`,
  'src/components/LoadingSpinner.jsx': `export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-700"></div>
    </div>
  );
}`,
  'src/components/CategoryBadge.jsx': `export default function CategoryBadge({ category }) {
  const colors = {
    Cameras: 'bg-purple-100 text-purple-800',
    Camping: 'bg-green-100 text-green-800',
    Sports: 'bg-orange-100 text-orange-800',
    Event: 'bg-pink-100 text-pink-800',
    Household: 'bg-blue-100 text-blue-800',
    School: 'bg-yellow-100 text-yellow-800'
  };
  return <span className={\`badge \${colors[category] || 'bg-gray-100 text-gray-800'}\`}>{category}</span>;
}`,
  'src/components/StarRating.jsx': `import { Star } from 'lucide-react';
export default function StarRating({ rating, interactive, onRate }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(star => (
        <Star key={star} size={16}
          className={\`\${star <= Math.round(rating) ? 'text-gold fill-gold' : 'text-gray-300'} \${interactive ? 'cursor-pointer hover:scale-110 transition' : ''}\`}
          onClick={() => interactive && onRate && onRate(star)}
        />
      ))}
    </div>
  );
}`,
  'src/components/ProductCard.jsx': `import { Link } from 'react-router-dom';
import CategoryBadge from './CategoryBadge';
import StarRating from './StarRating';

export default function ProductCard({ product }) {
  return (
    <div className="card hover:shadow-md transition group overflow-hidden flex flex-col p-0">
      <div className="h-48 overflow-hidden relative">
        <img src={product.primary_image || 'https://via.placeholder.com/300x200?text=No+Image'} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        <div className="absolute top-3 left-3"><CategoryBadge category={product.category} /></div>
        <div className="absolute top-3 right-3">
          <span className={\`px-2 py-1 rounded text-xs font-bold \${product.availability ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}\`}>
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
          <Link to={\`/product/\${product.id}\`} className="btn-primary text-sm px-4 py-2">View Details</Link>
        </div>
      </div>
    </div>
  );
}`,
  'src/components/PaymentModal.jsx': `import { useState } from 'react';
import { X, QrCode, CreditCard, Building2, Wallet } from 'lucide-react';
export default function PaymentModal({ rental, onSuccess, onClose }) {
  const [method, setMethod] = useState('gcash');
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onSuccess(); }, 1500); // Simulate API
  };

  const tabs = [
    { id: 'gcash', icon: Wallet, label: 'GCash' },
    { id: 'maya', icon: Wallet, label: 'Maya' },
    { id: 'card', icon: CreditCard, label: 'Card' },
    { id: 'bank', icon: Building2, label: 'Bank' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"><X /></button>
        <div className="bg-navy-700 p-6 text-white text-center">
          <h2 className="text-xl font-bold mb-1">Complete Payment</h2>
          <p className="opacity-80 text-sm">Total: ₱{rental?.total_price || 0}</p>
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setMethod(t.id)} className={\`flex-1 py-2 text-xs font-semibold rounded flex flex-col items-center gap-1 \${method === t.id ? 'bg-white shadow text-navy-700' : 'text-gray-500'}\`}>
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>
          
          <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
            {method === 'gcash' || method === 'maya' ? (
              <div className="space-y-4">
                <div className="w-32 h-32 bg-navy-50 flex items-center justify-center mx-auto rounded border-2 border-dashed border-navy-200">
                  <QrCode size={48} className="text-navy-300" />
                </div>
                <p className="text-sm font-semibold">{method === 'gcash' ? '0917-123-4567' : '0918-987-6543'}</p>
                <p className="text-xs text-gray-500">Scan QR or send to number above</p>
              </div>
            ) : method === 'bank' ? (
              <div className="space-y-2 text-left w-full bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-semibold">BDO Unibank</p>
                <p className="text-sm">Account: 002-345-678-9</p>
                <p className="text-sm">Name: RentAway Inc.</p>
              </div>
            ) : (
              <div className="space-y-3 w-full text-left">
                <input className="input" placeholder="Card Number" type="text" />
                <div className="flex gap-3">
                  <input className="input w-1/2" placeholder="MM/YY" type="text" />
                  <input className="input w-1/2" placeholder="CVC" type="text" />
                </div>
                <input className="input" placeholder="Cardholder Name" type="text" />
              </div>
            )}
          </div>
          <button disabled={loading} onClick={handlePay} className="btn-primary w-full mt-6">
            {loading ? 'Processing...' : method === 'card' ? 'Pay Now' : "I've Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}`
};

Object.keys(files).forEach(file => {
  const fullPath = path.join(clientDir, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, files[file]);
});
console.log('Components created.');
