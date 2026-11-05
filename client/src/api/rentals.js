import api from "./axios";
export const createRental = (data) => api.post("/rentals", data);
export const getRentals = (params) => api.get("/rentals", { params });
export const getRental = (id) => api.get(`/rentals/${id}`);
export const updateRentalStatus = (id, status, notes) =>
  api.put(`/rentals/${id}/status`, { status, notes });
