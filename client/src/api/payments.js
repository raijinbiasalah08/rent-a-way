import api from './axios';
export const processPayment = (rentalId, method) => api.post(`/payments/rental/${rentalId}`, { method });
export const getPaymentByRental = (rentalId) => api.get(`/payments/rental/${rentalId}`);
export const getPayments = () => api.get('/payments');
export const createPayMongoSession = (data) => api.post('/payments/paymongo/create-session', data);
export const verifyPayMongoPayment = (checkoutSessionId) => api.get(`/payments/paymongo/verify/${checkoutSessionId}`);

// Real GCash / Maya Direct Payment Proofs
export const getSupplierPaymentAccount = (productId) => api.get(`/payments/supplier-account/${productId}`);
export const submitPaymentProof = (formData) => api.post('/payments/submit-proof', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getPaymentProof = (rentalId) => api.get(`/payments/proof/${rentalId}`);
export const verifyPaymentProof = (rentalId, data) => api.put(`/payments/verify-proof/${rentalId}`, data);