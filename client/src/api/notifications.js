import API from './axios';

export const getNotifications = () => API.get('/notifications');
export const markNotificationRead = (id) => API.put('/notifications/' + id + '/read');
export const markAllNotificationsRead = () => API.put('/notifications/read-all');
