import type { ReactNode } from 'react';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { API_ORIGIN } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { ServerToClientEvents } from '../types/socket';

export type DashboardSocket = Socket<ServerToClientEvents, Record<string, never>>;

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface SocketContextValue {
  socket: DashboardSocket | null;
  status: ConnectionStatus;
  /** Manually retry after the client has given up (status "offline"). */
  retry: () => void;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

const RECONNECTION_ATTEMPTS = 8;

/**
 * Owns the single Socket.IO connection for the signed-in session and tracks
 * its health. Every page subscribes through this connection instead of
 * opening its own.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, logout } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  // One socket per session token. Creating it does not connect (autoConnect: false).
  const socket = useMemo<DashboardSocket | null>(
    () =>
      token
        ? io(API_ORIGIN || undefined, {
            auth: { token },
            autoConnect: false,
            forceNew: true,
            reconnectionAttempts: RECONNECTION_ATTEMPTS,
            reconnectionDelay: 1_000,
            reconnectionDelayMax: 10_000,
          })
        : null,
    [token],
  );

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setStatus('live');

    const handleDisconnect = (reason: Socket.DisconnectReason) => {
      if (reason === 'io client disconnect') return; // We closed it ourselves.
      setStatus('reconnecting');
      if (reason === 'io server disconnect') {
        // The server closed the connection (e.g. the token expired). Socket.IO
        // does not retry this case automatically; one attempt tells us whether
        // the session is still valid.
        socket.connect();
      }
    };

    const handleConnectError = (error: Error) => {
      if (error.message === 'Unauthorized') {
        // The session is no longer valid: stop retrying and sign out.
        setStatus('offline');
        socket.disconnect();
        logout();
        return;
      }
      // socket.active is false once Socket.IO has stopped retrying.
      setStatus(socket.active ? 'reconnecting' : 'offline');
    };

    const handleReconnectAttempt = () => setStatus('reconnecting');
    const handleReconnectFailed = () => setStatus('offline');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    socket.io.on('reconnect_failed', handleReconnectFailed);
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.io.off('reconnect_failed', handleReconnectFailed);
      socket.disconnect();
    };
  }, [socket, logout]);

  const retry = useCallback(() => {
    if (!socket || socket.connected) return;
    setStatus('reconnecting');
    socket.connect();
  }, [socket]);

  // Coming back online is a good moment to try again without user action.
  useEffect(() => {
    if (status !== 'offline') return;
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [status, retry]);

  const value = useMemo(() => ({ socket, status, retry }), [socket, status, retry]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
