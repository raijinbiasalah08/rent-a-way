import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { CustomerLocationProvider } from "./context/CustomerLocationContext";
import { SocketProvider } from "./context/SocketContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { registerSW } from "virtual:pwa-register";

import { HelmetProvider } from "react-helmet-async";

// A standalone PWA can keep an older app shell after a deployment. If that
// shell requests a removed lazy-loaded chunk, reload once to get the current
// asset manifest. The boundary below provides a recovery screen if it fails
// again or a route has another rendering error.
const PRELOAD_RELOAD_KEY = "rentaway:preload-reload-at";
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();

  try {
    const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY));
    if (lastReload && Date.now() - lastReload < 60_000) return;
    sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
    window.location.reload();
  } catch {
    // If storage is unavailable, let the React error boundary show its fallback
    // instead of risking an automatic reload loop.
  }
});

// Register PWA Service Worker
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (confirm("New content available. Reload?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <AppErrorBoundary>
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
      </AppErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>,
);
