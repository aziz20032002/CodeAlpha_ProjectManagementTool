import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthLoading() {
  return (
    <div className="loading-state loading-state--fullscreen">
      <div className="loading-state__spinner" aria-hidden="true" />
      <p>Loading...</p>
    </div>
  );
}

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
