import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types/auth';
import { LoadingState } from './LoadingState';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Restrict to these roles. The server enforces the same rule; this only avoids a dead-end page. */
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState label="Checking your session…" />;
  }

  if (status === 'anonymous' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <section className="page" aria-labelledby="forbidden-heading">
        <h1 id="forbidden-heading">Access denied</h1>
        <p>You do not have permission to view this page.</p>
      </section>
    );
  }

  return <>{children}</>;
}
