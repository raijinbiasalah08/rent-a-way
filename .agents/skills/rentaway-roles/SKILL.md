---
name: rentaway-roles
description: >-
  Use this skill when working with role-based access control in RentAway.
  Covers the three user roles (admin, supplier, customer), how roles are
  enforced on the backend via middleware, how the frontend guards routes and
  UI elements per role, and the role-specific page/dashboard structure.
---

# RentAway — Role-Based Access Control

## Roles
| Role | Description |
|------|-------------|
| `admin` | Full platform access, manage users/products/rentals/reports |
| `supplier` | List products, manage own inventory, approve/reject rental requests |
| `customer` | Browse products, book rentals, track orders, post community content |

---

## Backend: Enforcing Roles

### JWT Payload
After login, the JWT contains:
```json
{ "id": "uuid", "email": "user@email.com", "role": "customer" }
```

### Middleware Usage
```js
// Require any logged-in user
router.get('/profile', authenticate, handler);

// Require specific role(s)
router.get('/my-products', authenticate, authorize('supplier'), handler);
router.get('/dashboard', authenticate, authorize('admin'), handler);
router.post('/products', authenticate, authorize('supplier', 'admin'), handler);
```

### Accessing Current User in a Handler
```js
router.get('/me', authenticate, (req, res) => {
  const { id, email, role } = req.user; // injected by authenticate middleware
  ...
});
```

---

## Frontend: Protecting Routes

### `ProtectedRoute` Component
Located at `client/src/components/ProtectedRoute.jsx`.
Wraps routes to redirect unauthenticated users to `/login`.

```jsx
<Route path="/customer/dashboard" element={
  <ProtectedRoute>
    <CustomerDashboard />
  </ProtectedRoute>
} />
```

### Role Check in `App.jsx`
The router in `App.jsx` maps roles to page groups:
- `/admin/*` → Admin pages (role: `admin`)
- `/supplier/*` → Supplier pages (role: `supplier`)
- `/customer/*` → Customer pages (role: `customer`)
- `/` → Public pages (no auth required)

### Conditional UI Rendering by Role
Use `AuthContext` to get the current user's role:
```jsx
import { useAuth } from '../context/AuthContext';

const { user } = useAuth();

{user?.role === 'supplier' && <AddProductButton />}
{user?.role === 'admin' && <AdminControls />}
```

---

## Role-Specific Page Map

### Admin (`/admin/*`)
| Path | File |
|------|------|
| `/admin/dashboard` | `pages/admin/Dashboard.jsx` |
| `/admin/users` | `pages/admin/Users.jsx` |
| `/admin/products` | `pages/admin/Products.jsx` |
| `/admin/rentals` | `pages/admin/Rentals.jsx` |
| `/admin/payments` | `pages/admin/Payments.jsx` |
| `/admin/reports` | `pages/admin/Reports.jsx` |
| `/admin/complaints` | `pages/admin/Complaints.jsx` |

### Supplier (`/supplier/*`)
| Path | File |
|------|------|
| `/supplier/dashboard` | `pages/supplier/Dashboard.jsx` |
| `/supplier/products` | `pages/supplier/MyProducts.jsx` |
| `/supplier/products/add` | `pages/supplier/AddProduct.jsx` |
| `/supplier/products/edit/:id` | `pages/supplier/EditProduct.jsx` |
| `/supplier/rentals` | `pages/supplier/RentalRequests.jsx` |

### Customer (`/customer/*`)
| Path | File |
|------|------|
| `/customer/dashboard` | `pages/customer/Dashboard.jsx` |
| `/customer/rentals` | `pages/customer/MyRentals.jsx` |
| `/customer/booking/:id` | `pages/customer/Booking.jsx` |
| `/customer/community` | `pages/customer/Community.jsx` |
| `/customer/profile` | `pages/customer/Profile.jsx` |

---

## Post-Login Redirect
After login, redirect the user based on their role:
```js
if (role === 'admin') navigate('/admin/dashboard');
else if (role === 'supplier') navigate('/supplier/dashboard');
else navigate('/customer/dashboard');
```

---

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rentaway.com | admin123 |
| Supplier | supplier1@rentaway.com | supplier123 |
| Customer | customer1@rentaway.com | customer123 |
