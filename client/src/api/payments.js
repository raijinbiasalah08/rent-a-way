import api from './axios';
export const processPayment = (rentalId, method) => api.post(`/payments/rental/${rentalId}`, { method });
export const getPayments = () => api.get('/payments');