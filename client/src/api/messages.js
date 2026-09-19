import API from './axios';

export const getConversations = () => API.get('/messages/conversations');
export const getMessages = (userId, productId) => API.get(`/messages/${userId}${productId ? `?productId=${productId}` : ''}`);
export const sendMessage = (data) => API.post('/messages', data);
