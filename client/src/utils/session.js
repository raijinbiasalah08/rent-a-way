export const readToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");
export function clearToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}
export function saveToken(token, remember = true) {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem("token", token);
}
