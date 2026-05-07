import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
