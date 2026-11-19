import { lazy, Suspense, useLayoutEffect, useRef } from "react";
import {
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import RouteMotion from "./components/RouteMotion";
import Navbar from "./components/Navbar";
import WorkspaceNavigation from "./components/WorkspaceNavigation";
import Footer from "./components/Footer";
import MobileBottomNav, {
  shouldShowMobileBottomNav,
} from "./components/MobileBottomNav";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingSpinner from "./components/LoadingSpinner";
import { useAuth } from "./context/AuthContext";

const Home = lazy(() => import("./pages/public/Home"));
const Browse = lazy(() => import("./pages/public/Browse"));
const ProductDetail = lazy(() => import("./pages/public/ProductDetail"));
const Login = lazy(() => import("./pages/public/Login"));
const Register = lazy(() => import("./pages/public/Register"));
const RegisterRenter = lazy(() => import("./pages/public/RegisterRenter"));
const RegisterSupplier = lazy(() => import("./pages/public/RegisterSupplier"));
const ChooseRole = lazy(() => import("./pages/public/ChooseRole"));
const ForgotPassword = lazy(() => import("./pages/public/ForgotPassword"));
const ForSuppliers = lazy(() => import("./pages/public/ForSuppliers"));
const Messages = lazy(() => import("./pages/public/Messages"));
const Checkout = lazy(() => import("./pages/public/Checkout"));
const MapSearch = lazy(() => import("./pages/public/MapSearch"));

const CustomerDashboard = lazy(() => import("./pages/customer/Dashboard"));
const CustomerRentals = lazy(() => import("./pages/customer/MyRentals"));
const CustomerBooking = lazy(() => import("./pages/customer/Booking"));
const CustomerProfile = lazy(() => import("./pages/customer/Profile"));
const CustomerCommunity = lazy(() => import("./pages/customer/Community"));
const CustomerFavorites = lazy(() => import("./pages/customer/Favorites"));

const SupplierDashboard = lazy(() => import("./pages/supplier/Dashboard"));
const SupplierProducts = lazy(() => import("./pages/supplier/MyProducts"));
const AddProduct = lazy(() => import("./pages/supplier/AddProduct"));
const EditProduct = lazy(() => import("./pages/supplier/EditProduct"));
const RentalRequests = lazy(() => import("./pages/supplier/RentalRequests"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminRentals = lazy(() => import("./pages/admin/Rentals"));
const AdminComplaints = lazy(() => import("./pages/admin/Complaints"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));

const ResetPassword = lazy(() => import("./pages/public/ResetPassword"));
const Help = lazy(() => import("./pages/public/Help"));
const NotFound = () => (
  <div className="mx-auto max-w-lg px-5 py-20 text-center">
    <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
    <p className="my-4 text-slate-600">
      This link may have changed. You can still browse available equipment or
      return home.
    </p>
    <div className="flex flex-wrap justify-center gap-3">
      <Link to="/browse" className="btn-primary">
        Browse equipment
      </Link>
      <Link to="/" className="btn-secondary">
        Back home
      </Link>
    </div>
  </div>
);

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (user?.role === "supplier")
    return <Navigate to="/supplier/dashboard" replace />;
  if (user?.role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/customer/dashboard" replace />;
};

const SettingsRedirect = () => {
  const { user } = useAuth();
  if (user?.role === "supplier")
    return <Navigate to="/supplier/profile" replace />;
  if (user?.role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/customer/profile" replace />;
};

function App() {
  const { pathname, hash } = useLocation();
  const navigation = useNavigationType();
  const previousPath = useRef(pathname);
  const content = useRef(null);
  useLayoutEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    if (navigation === "POP" || hash) return;
    window.scrollTo(0, 0);
    content.current?.focus({ preventScroll: true });
  }, [pathname, hash, navigation]);
  const { loading, user } = useAuth();
  const workspace = pathname.split("/")[1];
  const showWorkspaceLinks =
    user &&
    (workspace === user.role ||
      (workspace === "renter" && user.role === "customer")) &&
    /^\/(admin|supplier|customer|renter)\/(?!dashboard\/?$).+/.test(pathname);
  const showMobileNav = !loading && shouldShowMobileBottomNav(pathname);

  return (
    <div
      className={`flex min-h-screen flex-col ${showMobileNav ? "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0" : ""}`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-blue-900"
      >
        Skip to content
      </a>
      <Navbar />
      {showWorkspaceLinks && <WorkspaceNavigation role={user.role} fullWidth />}
      <main ref={content} id="main-content" tabIndex={-1} className="flex-grow">
        <Suspense
          fallback={
            <div className="route-loading min-h-[60svh] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          }
        >
          <RouteMotion contentRef={content}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/help" element={<Help />} />
              <Route path="/how-it-works" element={<Help />} />
              <Route path="/map" element={<MapSearch />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-renter" element={<RegisterRenter />} />
              <Route path="/register-supplier" element={<RegisterSupplier />} />
              <Route path="/choose-role" element={<ChooseRole />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardRedirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsRedirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <SettingsRedirect />
                  </ProtectedRoute>
                }
              />
              <Route path="/community" element={<CustomerCommunity />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPassword />}
              />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/for-suppliers" element={<ForSuppliers />} />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute
                    allowedRoles={["renter", "customer", "supplier", "admin"]}
                  >
                    <Messages />
                  </ProtectedRoute>
                }
              />

              {/* Renter aliases */}
              <Route
                path="/renter"
                element={<Navigate to="/customer/dashboard" replace />}
              />
              <Route
                path="/renter/*"
                element={
                  <ProtectedRoute allowedRoles={["renter", "customer"]}>
                    <Routes>
                      <Route index element={<CustomerDashboard />} />
                      <Route path="dashboard" element={<CustomerDashboard />} />
                      <Route path="checkout" element={<Checkout />} />
                      <Route path="rentals" element={<CustomerRentals />} />
                      <Route
                        path="booking/:productId"
                        element={<CustomerBooking />}
                      />
                      <Route path="profile" element={<CustomerProfile />} />
                      <Route path="settings" element={<CustomerProfile />} />
                      <Route path="community" element={<CustomerCommunity />} />
                      <Route path="favorites" element={<CustomerFavorites />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/customer"
                element={<Navigate to="/customer/dashboard" replace />}
              />
              <Route
                path="/customer/*"
                element={
                  <ProtectedRoute allowedRoles={["renter", "customer"]}>
                    <Routes>
                      <Route index element={<CustomerDashboard />} />
                      <Route path="checkout" element={<Checkout />} />
                      <Route path="dashboard" element={<CustomerDashboard />} />
                      <Route path="rentals" element={<CustomerRentals />} />
                      <Route
                        path="booking/:productId"
                        element={<CustomerBooking />}
                      />
                      <Route path="profile" element={<CustomerProfile />} />
                      <Route path="settings" element={<CustomerProfile />} />
                      <Route path="community" element={<CustomerCommunity />} />
                      <Route path="favorites" element={<CustomerFavorites />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/supplier"
                element={<Navigate to="/supplier/dashboard" replace />}
              />
              <Route
                path="/supplier/*"
                element={
                  <ProtectedRoute allowedRoles={["supplier"]}>
                    <Routes>
                      <Route index element={<SupplierDashboard />} />
                      <Route path="dashboard" element={<SupplierDashboard />} />
                      <Route path="products" element={<SupplierProducts />} />
                      <Route path="products/new" element={<AddProduct />} />
                      <Route
                        path="products/:id/edit"
                        element={<EditProduct />}
                      />
                      <Route path="rentals" element={<RentalRequests />} />
                      <Route path="profile" element={<CustomerProfile />} />
                      <Route path="settings" element={<CustomerProfile />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="rentals" element={<AdminRentals />} />
                      <Route path="complaints" element={<AdminComplaints />} />
                      <Route path="reports" element={<AdminReports />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </RouteMotion>
        </Suspense>
      </main>
      {!pathname.startsWith("/admin/") &&
        !/^\/(register(?:-renter|-supplier)?|choose-role|login|forgot-password|reset-password)(\/|$)/.test(
          pathname,
        ) && <Footer />}
      {showMobileNav && <MobileBottomNav />}
    </div>
  );
}
export default App;
