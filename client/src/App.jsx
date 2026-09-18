import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/public/Home';
import Browse from './pages/public/Browse';
import ProductDetail from './pages/public/ProductDetail';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';
import ForSuppliers from './pages/public/ForSuppliers';

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
          <Route path="/for-suppliers" element={<ForSuppliers />} />

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
export default App;