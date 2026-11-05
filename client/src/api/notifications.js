import API from "./axios";

export const getNotifications = (params) =>
  API.get("/notifications", { params });
export const markNotificationRead = (id) =>
  API.put("/notifications/" + id + "/read");
export const markAllNotificationsRead = () =>
  API.put("/notifications/read-all");
