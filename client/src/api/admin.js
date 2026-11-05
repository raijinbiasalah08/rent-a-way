import api from "./axios";
export const createAdminUser = (data) => api.post("/admin/users", data);
export const getStats = () => api.get("/admin/stats");
export const getUsers = (params) => api.get("/admin/users", { params });
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
export const getAdminProducts = () => api.get("/admin/products");
export const toggleProduct = (id) => api.put(`/admin/products/${id}/toggle`);
export const getAdminRentals = () => api.get("/admin/rentals");
export const getComplaints = () => api.get("/admin/complaints");
export const createComplaint = (data) => api.post("/admin/complaints", data);
export const updateComplaint = (id, data) =>
  api.put(`/admin/complaints/${id}`, data);
export const getReports = () => api.get("/admin/reports");
