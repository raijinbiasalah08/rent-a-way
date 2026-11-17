export const readToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

export function signInDestination(state, fallback) {
  const path = state?.returnTo;
  if (
    typeof path !== "string" ||
    !/^\/(?:admin|supplier|customer|renter|messages|product|dashboard|profile|settings)(?:[/?#]|$)/.test(
      path,
    )
  )
    return fallback;
  return path;
}
export function clearToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}
export function saveToken(token, remember = true) {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem("token", token);
}
