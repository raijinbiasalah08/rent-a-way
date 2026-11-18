import api from "./axios";
function registrationForm(data) {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) form.append(key, value);
  });
  return form;
}
export const register = (data) => api.post("/auth/register", registrationForm(data));
export const login = (data) => api.post("/auth/login", data);
export const getGoogleConfig = () => api.get("/auth/google/config");
export const googleLogin = (data) => api.post("/auth/google", data.identityDocument ? registrationForm(data) : data);
export const getMe = () => api.get("/auth/me");
export const updateProfile = (data) => api.put("/auth/profile", data);
export const uploadAvatar = (formData) =>
  api.post("/auth/profile/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updatePassword = (data) => api.put("/auth/password", data);
export const forgotPassword = (data) => api.post("/auth/forgot-password", data);
