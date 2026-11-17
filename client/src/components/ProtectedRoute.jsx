import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, sessionError, retrySession } = useAuth();
  const { pathname, search, hash } = useLocation();
  if (loading) return <LoadingSpinner />;
  if (sessionError)
    return (
      <div role="alert" className="card m-8 p-6">
        <p>{sessionError}</p>
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={retrySession}
        >
          Retry connection
        </button>
      </div>
    );
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ returnTo: pathname + search + hash }}
        replace
      />
    );
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
}
