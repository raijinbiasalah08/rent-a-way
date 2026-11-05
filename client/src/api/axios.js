import axios from "axios";
import { API_BASE_URL } from "../config";
import { readToken } from "../utils/session";

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export default api;
