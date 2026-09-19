import api from './axios';
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const uploadAvatar = (formData) => api.post('/auth/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updatePassword = (data) => api.put('/auth/password', data);
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);