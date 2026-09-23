import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { CustomerLocationProvider } from './context/CustomerLocationContext';
import { SocketProvider } from './context/SocketContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';

import { HelmetProvider } from 'react-helmet-async';

// Register PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <CustomerLocationProvider>
            <SocketProvider>
              <FavoritesProvider>
                <App />
                <Toaster position="top-right" />
              </FavoritesProvider>
            </SocketProvider>
          </CustomerLocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);