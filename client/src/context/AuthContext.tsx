import type { ReactNode } from 'react';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/authApi';
import { setUnauthorizedHandler } from '../api/client';
import type { LoginCredentials, RegisterDetails, User } from '../types/auth';
import { tokenStorage } from '../utils/tokenStorage';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (details: RegisterDetails) => Promise<void>;
  logout: () => void;
}

interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function initialState(): AuthState {
  const token = tokenStorage.get();
  // With a stored token we must confirm it with the server before trusting it.
  return { status: token ? 'loading' : 'anonymous', user: null, token };
}

const anonymous: AuthState = { status: 'anonymous', user: null, token: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const logout = useCallback(() => {
    // JWTs are stateless: signing out means discarding the token client-side.
    tokenStorage.clear();
    setState(anonymous);
  }, []);

  // Validate a stored token once on start-up.
  const pendingToken = state.status === 'loading' ? state.token : null;
  useEffect(() => {
    if (!pendingToken) return;
    let cancelled = false;
    authApi
      .fetchCurrentUser()
      .then((user) => {
        if (!cancelled) setState({ status: 'authenticated', user, token: pendingToken });
      })
      .catch(() => {
        if (cancelled) return;
        tokenStorage.clear();
        setState(anonymous);
      });
    return () => {
      cancelled = true;
    };
  }, [pendingToken]);

  // Any 401 on an authenticated request means the session is no longer valid.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const startSession = useCallback((user: User, token: string) => {
    tokenStorage.set(token);
    setState({ status: 'authenticated', user, token });
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const { user, token } = await authApi.login(credentials);
      startSession(user, token);
    },
    [startSession],
  );

  const register = useCallback(
    async (details: RegisterDetails) => {
      const { user, token } = await authApi.register(details);
      startSession(user, token);
    },
    [startSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
