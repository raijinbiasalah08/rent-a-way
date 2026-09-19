import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

const Home = lazy(() => import('./pages/public/Home'));
const Browse = lazy(() => import('./pages/public/Browse'));
const ProductDetail = lazy(() => import('./pages/public/ProductDetail'));
const Login = lazy(() => import('./pages/public/Login'));
const Register = lazy(() => import('./pages/public/Register'));
const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword'));
const ForSuppliers = lazy(() => import('./pages/public/ForSuppliers'));
const Messages = lazy(() => import('./pages/public/Messages'));
const Checkout = lazy(() => import('./pages/public/Checkout'));
const MapSearch = lazy(() => import('./pages/public/MapSearch'));

const CustomerDashboard = lazy(() => import('./pages/customer/Dashboard'));
const CustomerRentals = lazy(() => import('./pages/customer/MyRentals'));
const CustomerBooking = lazy(() => import('./pages/customer/Booking'));
const CustomerProfile = lazy(() => import('./pages/customer/Profile'));
const CustomerCommunity = lazy(() => import('./pages/customer/Community'));
const CustomerFavorites = lazy(() => import('./pages/customer/Favorites'));

const SupplierDashboard = lazy(() => import('./pages/supplier/Dashboard'));
const SupplierProducts = lazy(() => import('./pages/supplier/MyProducts'));
const AddProduct = lazy(() => import('./pages/supplier/AddProduct'));
const EditProduct = lazy(() => import('./pages/supplier/EditProduct'));
const RentalRequests = lazy(() => import('./pages/supplier/RentalRequests'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminRentals = lazy(() => import('./pages/admin/Rentals'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminComplaints = lazy(() => import('./pages/admin/Complaints'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));

const NotFound = () => <div className="text-center p-20"><h1>404 Not Found</h1><a href="/" className="btn-primary mt-4 inline-block">Back Home</a></div>;

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/map" element={<MapSearch />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/for-suppliers" element={<ForSuppliers />} />
            <Route path="/messages" element={
              <ProtectedRoute allowedRoles={['customer', 'supplier']}>
                <Messages />
              </ProtectedRoute>
            } />

            <Route path="/customer/*" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <Routes>
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="dashboard" element={<CustomerDashboard />} />
                  <Route path="rentals" element={<CustomerRentals />} />
                  <Route path="booking/:productId" element={<CustomerBooking />} />
                  <Route path="profile" element={<CustomerProfile />} />
                  <Route path="community" element={<CustomerCommunity />} />
                  <Route path="favorites" element={<CustomerFavorites />} />
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
                  <Route path="profile" element={<CustomerProfile />} />
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
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
export default App;