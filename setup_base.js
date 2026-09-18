const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, 'client');

const files = {
  'package.json': `{
  "name": "rentaway-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.7",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-datepicker": "^6.2.0",
    "react-dom": "^18.2.0",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.22.3",
    "recharts": "^2.12.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "vite": "^5.1.5"
  }
}`,
  'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
})`,
  'tailwind.config.js': `export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8eaf6',
          100: '#c5cae9',
          500: '#3949ab',
          600: '#283593',
          700: '#1a237e',
          800: '#0d1b6e',
          900: '#040d5e'
        },
        cream: {
          50: '#fefef9',
          100: '#faf8ee',
          200: '#f5f0dc',
          300: '#ede3c0'
        },
        gold: '#f4c430'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}`,
  'postcss.config.js': `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}`,
  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RentAway — Find Better Ways to Save</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
  'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-cream-100 text-gray-800 font-sans;
  }
}

@layer components {
  .btn-primary {
    @apply bg-navy-700 hover:bg-navy-800 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors duration-200;
  }
  .btn-secondary {
    @apply bg-cream-200 hover:bg-cream-300 text-navy-700 font-semibold px-6 py-2.5 rounded-lg transition-colors duration-200;
  }
  .btn-outline {
    @apply border-2 border-navy-700 text-navy-700 hover:bg-navy-700 hover:text-white font-semibold px-6 py-2.5 rounded-lg transition-colors duration-200;
  }
  .card {
    @apply bg-white rounded-xl shadow-sm border border-cream-300 p-6;
  }
  .input {
    @apply w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent transition;
  }
  .label {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }
  .badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }
  .badge-pending { @apply badge bg-yellow-100 text-yellow-800; }
  .badge-approved { @apply badge bg-blue-100 text-blue-800; }
  .badge-active { @apply badge bg-green-100 text-green-800; }
  .badge-completed { @apply badge bg-gray-100 text-gray-800; }
  .badge-returned { @apply badge bg-purple-100 text-purple-800; }
  .badge-cancelled { @apply badge bg-red-100 text-red-800; }
}`,
  'src/api/axios.js': `import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:5000/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});
export default api;`,
  'src/api/auth.js': `import api from './axios';
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const updatePassword = (data) => api.put('/auth/password', data);
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);`,
  'src/api/products.js': `import api from './axios';
export const getProducts = (params) => api.get('/products', { params });
export const getProduct = (id) => api.get(\`/products/\${id}\`);
export const getCategories = () => api.get('/products/categories');
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(\`/products/\${id}\`, data);
export const deleteProduct = (id) => api.delete(\`/products/\${id}\`);
export const uploadProductImage = (id, formData) => api.post(\`/products/\${id}/images\`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });`,
  'src/api/rentals.js': `import api from './axios';
export const createRental = (data) => api.post('/rentals', data);
export const getRentals = () => api.get('/rentals');
export const getRental = (id) => api.get(\`/rentals/\${id}\`);
export const updateRentalStatus = (id, status) => api.put(\`/rentals/\${id}/status\`, { status });`,
  'src/api/payments.js': `import api from './axios';
export const processPayment = (rentalId, method) => api.post(\`/payments/rental/\${rentalId}\`, { method });
export const getPayments = () => api.get('/payments');`,
  'src/api/reviews.js': `import api from './axios';
export const getProductReviews = (productId) => api.get(\`/reviews/product/\${productId}\`);
export const createReview = (data) => api.post('/reviews', data);`,
  'src/api/community.js': `import api from './axios';
export const getPosts = (params) => api.get('/community', { params });
export const createPost = (data) => api.post('/community', data);
export const likePost = (id) => api.put(\`/community/\${id}/like\`);`,
  'src/api/admin.js': `import api from './axios';
export const getStats = () => api.get('/admin/stats');
export const getUsers = (params) => api.get('/admin/users', { params });
export const updateUser = (id, data) => api.put(\`/admin/users/\${id}\`, data);
export const deleteUser = (id) => api.delete(\`/admin/users/\${id}\`);
export const getAdminProducts = () => api.get('/admin/products');
export const toggleProduct = (id) => api.put(\`/admin/products/\${id}/toggle\`);
export const getAdminRentals = () => api.get('/admin/rentals');
export const getAdminPayments = () => api.get('/admin/payments');
export const getComplaints = () => api.get('/admin/complaints');
export const createComplaint = (data) => api.post('/admin/complaints', data);
export const updateComplaint = (id, data) => api.put(\`/admin/complaints/\${id}\`, data);
export const getReports = () => api.get('/admin/reports');`,
  'src/context/AuthContext.jsx': `import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as apiLogin, register as apiRegister, getMe } from '../api/auth';
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe().then(res => setUser(res.data)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);
  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };
  const register = async (data) => {
    const res = await apiRegister(data);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };
  const updateUser = (data) => setUser({ ...user, ...data });
  return <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>{children}</AuthContext.Provider>;
};`
};

Object.keys(files).forEach(file => {
  const fullPath = path.join(clientDir, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, files[file]);
});
console.log('Base files created.');
