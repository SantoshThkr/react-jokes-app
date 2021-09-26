import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type { AuthContextValue } from '../context/AuthContext';
import { AuthContext } from '../context/AuthContext';
import type { SocketContextValue } from '../context/SocketContext';
import { SocketContext } from '../context/SocketContext';
import type { User } from '../types/auth';

export const adminUser: User = {
  id: 'u-admin',
  name: 'Ada Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  createdAt: '2021-09-01T00:00:00.000Z',
  updatedAt: '2021-09-01T00:00:00.000Z',
};

export const viewerUser: User = { ...adminUser, id: 'u-viewer', name: 'Victor Viewer', role: 'VIEWER' };

export function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'authenticated',
    user: viewerUser,
    token: 'test-token',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

interface Options {
  auth?: Partial<AuthContextValue>;
  socket?: Partial<SocketContextValue>;
  route?: string;
}

/** Render with router, auth and socket context supplied directly (no network). */
export function renderWithProviders(ui: ReactElement, { auth, socket, route = '/' }: Options = {}) {
  const socketValue: SocketContextValue = { socket: null, status: 'live', retry: vi.fn(), ...socket };
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authValue(auth)}>
        <SocketContext.Provider value={socketValue}>{ui}</SocketContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}
