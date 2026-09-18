import api from './axios';
export const getPosts = (params) => api.get('/community', { params });
export const createPost = (data) => api.post('/community', data);
export const likePost = (id) => api.put(`/community/${id}/like`);