import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getFavorites, addFavorite, removeFavorite } from '../api/favorites';
import toast from 'react-hot-toast';

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  useEffect(() => {
    if (user) {
      getFavorites().then(res => {
        setFavoriteIds(new Set(res.data.data.ids));
      }).catch(console.error);
    } else {
      setFavoriteIds(new Set());
    }
  }, [user]);

  const toggleFavorite = async (productId) => {
    if (!user) {
      toast.error('Please log in to save items.');
      return;
    }

    try {
      if (favoriteIds.has(productId)) {
        await removeFavorite(productId);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        toast.success('Removed from favorites');
      } else {
        await addFavorite(productId);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.add(productId);
          return next;
        });
        toast.success('Added to favorites');
      }
    } catch (err) {
      toast.error('Failed to update favorites');
    }
  };

  return (
    <FavoritesContext.Provider value={{ favoriteIds, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
