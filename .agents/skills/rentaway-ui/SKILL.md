---
name: rentaway-ui
description: >-
  Use this skill when building, modifying, or designing UI components and pages
  in RentAway. Covers the design system (TailwindCSS v3 config, color palette,
  typography), reusable component patterns, layout conventions for public/customer/
  supplier/admin pages, and frontend best practices for this project.
---

# RentAway — UI Design System & Conventions

## Stack
- **Framework:** React 18 + Vite
- **Styling:** TailwindCSS v3 (configured in `client/tailwind.config.js`)
- **Icons:** `lucide-react`
- **Charts:** `recharts` (used in dashboards)
- **Toasts:** `react-hot-toast`
- **Date Picker:** `react-datepicker`
- **Routing:** React Router DOM v6

---

## TailwindCSS Config
Located at `client/tailwind.config.js`. Purges from `./src/**/*.{js,jsx}`.
Check this file for any custom theme extensions (colors, fonts, spacing) before adding new ones.

---

## Color Palette & Brand
RentAway uses a consistent visual identity:
- **Primary:** Blue tones — `blue-600`, `blue-700`, `blue-800`
- **Accent:** Orange / Amber — `orange-500`, `amber-400`
- **Neutral:** Gray — `gray-50` to `gray-900`
- **Success:** `green-500` / `green-600`
- **Error/Danger:** `red-500` / `red-600`
- **Warning:** `yellow-500`

---

## Typography Conventions
- Page headings: `text-2xl font-bold` or `text-3xl font-bold`
- Section headings: `text-xl font-semibold`
- Card titles: `text-lg font-semibold`
- Body: `text-sm text-gray-600` or `text-base`
- Labels: `text-sm font-medium text-gray-700`

---

## Layout Conventions

### Public Pages
Full-width layout with `Navbar` and `Footer` wrapping content.
```jsx
<>
  <Navbar />
  <main className="min-h-screen">
    {/* page content */}
  </main>
  <Footer />
</>
```

### Dashboard Pages (Admin / Supplier / Customer)
Sidebar + main content layout. Each dashboard role has its own sidebar nav.
```jsx
<div className="flex min-h-screen bg-gray-50">
  <Sidebar />
  <main className="flex-1 p-6">
    {/* page content */}
  </main>
</div>
```

---

## Reusable Components

| Component | File | Usage |
|-----------|------|-------|
| `Navbar` | `components/Navbar.jsx` | Top navigation for public pages |
| `Footer` | `components/Footer.jsx` | Public page footer |
| `ProductCard` | `components/ProductCard.jsx` | Product listing card |
| `PaymentModal` | `components/PaymentModal.jsx` | Checkout/payment modal |
| `ProtectedRoute` | `components/ProtectedRoute.jsx` | Auth guard wrapper |
| `StarRating` | `components/StarRating.jsx` | 1–5 star display |
| `CategoryBadge` | `components/CategoryBadge.jsx` | Product category pill/badge |
| `LoadingSpinner` | `components/LoadingSpinner.jsx` | Loading state indicator |

---

## Common UI Patterns

### Button Styles
```jsx
// Primary
<button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
  Action
</button>

// Secondary / Outline
<button className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors">
  Cancel
</button>

// Danger
<button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
  Delete
</button>
```

### Form Input Styles
```jsx
<input
  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  type="text"
/>
```

### Card Container
```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
  {/* card content */}
</div>
```

### Status Badge
```jsx
// Adapt color based on status
const statusColors = {
  pending:  'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
};
<span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
  {status}
</span>
```

---

## Toast Notifications (react-hot-toast)
```jsx
import toast from 'react-hot-toast';

toast.success('Product added successfully!');
toast.error('Something went wrong.');
toast.loading('Uploading...');
```
`<Toaster />` is mounted in `main.jsx` or `App.jsx`.

---

## Loading States
Use `LoadingSpinner` for async operations:
```jsx
import LoadingSpinner from '../components/LoadingSpinner';

if (loading) return <LoadingSpinner />;
```

---

## Image Display
Always include a fallback for missing images:
```jsx
<img
  src={`http://localhost:5000${product.image_url}`}
  alt={product.name}
  onError={(e) => { e.target.src = '/placeholder.jpg'; }}
  className="w-full h-48 object-cover rounded-lg"
/>
```

---

## Performance Notes
- `Browse.jsx` and `Home.jsx` are large (26KB and 44KB). Consider extracting sub-components if adding more features.
- Use `React.memo` for list items like `ProductCard` to avoid unnecessary re-renders.
- Use `useCallback` for event handlers passed as props to memoized children.
