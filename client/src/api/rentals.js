import api from './axios';
export const createRental = (data) => api.post('/rentals', data);
export const getRentals = () => api.get('/rentals');
export const getRental = (id) => api.get(`/rentals/${id}`);
export const updateRentalStatus = (id, status) => api.put(`/rentals/${id}/status`, { status });