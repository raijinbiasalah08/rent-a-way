import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, sessionError, retrySession } = useAuth();
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
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
}
