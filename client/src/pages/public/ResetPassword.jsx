import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios";
import { clearToken } from "../../utils/session";
export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords must match");
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      clearToken();
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to reset password");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-md mx-auto p-6 my-12 card">
      <h1 className="text-2xl font-bold mb-5">Choose a new password</h1>
      {done ? (
        <p>
          Password updated.{" "}
          <Link className="text-blue-700 underline" to="/login">
            Sign in
          </Link>
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <label className="block">
            New password
            <input
              className="input"
              autoComplete="new-password"
              type="password"
              minLength={12}
              maxLength={72}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="block">
            Confirm password
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <p className="text-sm text-gray-500">Use at least 12 characters.</p>
          <button disabled={busy} className="btn-primary w-full">
            {busy ? "Updating…" : "Reset password"}
          </button>
        </form>
      )}
    </div>
  );
}
