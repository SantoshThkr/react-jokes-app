import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { AuthContextValue } from '../../context/AuthContext';
import { adminUser, renderWithProviders, viewerUser } from '../../test/renderWithProviders';
import { ProtectedRoute } from './ProtectedRoute';

function renderRoutes(auth: Partial<AuthContextValue>, roles?: ('ADMIN' | 'VIEWER')[]) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<h1>Login page</h1>} />
      <Route
        path="/secret"
        element={
          <ProtectedRoute roles={roles}>
            <h1>Secret page</h1>
          </ProtectedRoute>
        }
      />
    </Routes>,
    { auth, route: '/secret' },
  );
}

describe('ProtectedRoute', () => {
  it('redirects anonymous users to the login page', () => {
    renderRoutes({ status: 'anonymous', user: null, token: null });
    expect(screen.getByRole('heading', { name: 'Login page' })).toBeInTheDocument();
  });

  it('shows a loading state while the session is being verified', () => {
    renderRoutes({ status: 'loading', user: null });
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
  });

  it('renders the page for authenticated users', () => {
    renderRoutes({ user: viewerUser });
    expect(screen.getByRole('heading', { name: 'Secret page' })).toBeInTheDocument();
  });

  it('blocks users without a required role', () => {
    renderRoutes({ user: viewerUser }, ['ADMIN']);
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByText('Secret page')).not.toBeInTheDocument();
  });

  it('allows users with a required role', () => {
    renderRoutes({ user: adminUser }, ['ADMIN']);
    expect(screen.getByRole('heading', { name: 'Secret page' })).toBeInTheDocument();
  });
});
