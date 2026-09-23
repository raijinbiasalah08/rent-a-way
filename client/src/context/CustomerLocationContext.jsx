import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getDistanceText, calculateDistance } from '../utils/geo';
import { ROXAS_CENTER, isWithinRoxas, getBarangayCoordinates } from '../utils/roxasLocation';
import toast from 'react-hot-toast';

const CustomerLocationContext = createContext();

export const useCustomerLocation = () => useContext(CustomerLocationContext);

export function CustomerLocationProvider({ children }) {
  const { user } = useAuth();

  // Default to Roxas Poblacion or user's saved Roxas barangay
  const [customerBarangay, setCustomerBarangay] = useState(() => {
    return sessionStorage.getItem('rw_customer_barangay') || (user?.barangay || 'Poblacion');
  });

  const [customerCoords, setCustomerCoords] = useState(() => {
    try {
      const saved = sessionStorage.getItem('rw_customer_coords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isWithinRoxas(parsed[0], parsed[1])) return parsed;
      }
    } catch {}
    return getBarangayCoordinates(user?.barangay || 'Poblacion');
  });

  const [isGpsInsideRoxas, setIsGpsInsideRoxas] = useState(false);
  const [detecting, setDetecting] = useState(false);

  // Sync with user's saved profile coordinates if logged in and within Roxas
  useEffect(() => {
    if (user?.barangay) {
      setCustomerBarangay(user.barangay);
    }
    if (user?.latitude && user?.longitude && isWithinRoxas(user.latitude, user.longitude)) {
      const coords = [Number(user.latitude), Number(user.longitude)];
      setCustomerCoords(coords);
      try {
        sessionStorage.setItem('rw_customer_coords', JSON.stringify(coords));
      } catch {}
    } else if (user?.barangay) {
      const bCoords = getBarangayCoordinates(user.barangay);
      setCustomerCoords(bCoords);
    }
  }, [user]);

  const selectBarangay = (bName) => {
    setCustomerBarangay(bName);
    const bCoords = getBarangayCoordinates(bName);
    setCustomerCoords(bCoords);
    try {
      sessionStorage.setItem('rw_customer_barangay', bName);
      sessionStorage.setItem('rw_customer_coords', JSON.stringify(bCoords));
    } catch {}
  };

  // Function to prompt/request customer's GPS position
  const requestCustomerLocation = (silent = false) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        if (!silent) toast.error('Geolocation is not supported by your browser');
        return reject(new Error('Geolocation not supported'));
      }

      setDetecting(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          setDetecting(false);

          if (!isWithinRoxas(lat, lng)) {
            setIsGpsInsideRoxas(false);
            if (!silent) {
              toast('Your device GPS is outside Roxas. Using Roxas Barangay for accurate local distance.', {
                icon: '📍'
              });
            }
            // Fall back to Roxas Barangay coordinates
            const fallback = getBarangayCoordinates(customerBarangay || 'Poblacion');
            setCustomerCoords(fallback);
            resolve(fallback);
            return;
          }

          const coords = [lat, lng];
          setCustomerCoords(coords);
          setIsGpsInsideRoxas(true);
          try {
            sessionStorage.setItem('rw_customer_coords', JSON.stringify(coords));
          } catch {}
          if (!silent) toast.success('Roxas GPS location enabled! Distances updated.');
          resolve(coords);
        },
        (err) => {
          setDetecting(false);
          if (!silent) {
            console.warn('Geolocation error:', err.message);
            toast.error('Unable to retrieve GPS. Showing distances from Roxas Poblacion.');
          }
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  // Helper to format distance to any item strictly within Roxas
  const getItemDistance = (targetLat, targetLng) => {
    if (!targetLat || !targetLng) return null;
    const refCoords = (customerCoords && isWithinRoxas(customerCoords[0], customerCoords[1]))
      ? customerCoords
      : ROXAS_CENTER;
    return getDistanceText(refCoords, targetLat, targetLng);
  };

  return (
    <CustomerLocationContext.Provider
      value={{
        customerCoords,
        customerBarangay,
        selectBarangay,
        hasLocation: Boolean(customerCoords && customerCoords[0] && customerCoords[1]),
        isGpsInsideRoxas,
        detecting,
        requestCustomerLocation,
        getItemDistance,
        setCustomerCoords
      }}
    >
      {children}
    </CustomerLocationContext.Provider>
  );
}
