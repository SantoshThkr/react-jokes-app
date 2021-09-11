import { useContext } from 'react';
import type { AuthContextValue } from '../context/AuthContext';
import { AuthContext } from '../context/AuthContext';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
