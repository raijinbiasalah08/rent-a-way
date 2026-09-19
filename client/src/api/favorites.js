import API from './axios';

export const getFavorites = () => API.get('/favorites');
export const addFavorite = (productId) => API.post('/favorites/' + productId);
export const removeFavorite = (productId) => API.delete('/favorites/' + productId);
