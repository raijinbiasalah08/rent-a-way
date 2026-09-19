import api from './axios';
export const getProducts = (params) => api.get('/products', { params });
export const getProduct = (id) => api.get(`/products/${id}`);
export const getCategories = () => api.get('/products/categories');
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const uploadProductImage = (id, formData) => api.post(`/products/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const submitReview = (formData) => api.post('/reviews', formData, { headers: { 'Content-Type': 'multipart/form-data' } });