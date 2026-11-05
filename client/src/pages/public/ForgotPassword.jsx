import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../api/auth";
export default function ForgotPassword() {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await forgotPassword({ email });
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to send instructions");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-md mx-auto my-12 card p-6">
      <h1 className="text-2xl font-bold mb-4">Reset your password</h1>
      {done ? (
        <p role="status">
          If an account exists for that email address, you will receive a
          password reset link.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <label className="block">
            Email address
            <input
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <Link className="text-blue-700 block mt-6" to="/login">
        ← Back to sign in
      </Link>
    </div>
  );
}
