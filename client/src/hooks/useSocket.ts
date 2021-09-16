import { useContext, useEffect, useRef } from 'react';
import type { SocketContextValue } from '../context/SocketContext';
import { SocketContext } from '../context/SocketContext';
import type { ServerEventName, ServerToClientEvents } from '../types/socket';

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

/**
 * Subscribe to a server event for the lifetime of the component. The listener
 * is removed on unmount, and the latest `handler` is always used without
 * re-subscribing on every render.
 */
export function useSocketEvent<E extends ServerEventName>(event: E, handler: ServerToClientEvents[E]) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!socket) return;
    const listener = ((...args: Parameters<ServerToClientEvents[E]>) =>
      (handlerRef.current as (...a: typeof args) => void)(...args)) as ServerToClientEvents[E];
    // socket.io-client's typed overloads cannot follow a generic event name.
    const typedSocket = socket as unknown as {
      on: (e: E, l: ServerToClientEvents[E]) => void;
      off: (e: E, l: ServerToClientEvents[E]) => void;
    };
    typedSocket.on(event, listener);
    return () => typedSocket.off(event, listener);
  }, [socket, event]);
}

/**
 * Run `callback` whenever the socket (re)connects after a period in which
 * live events could have been missed, e.g. after a network drop or when the
 * page's REST snapshot was taken before the socket was connected. Pages use it
 * to refetch so they never show stale data after a reconnect.
 */
export function useResyncOnConnect(callback: () => void) {
  const { socket } = useSocket();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!socket) return;
    let mayHaveMissedEvents = !socket.connected;

    const handleConnect = () => {
      if (mayHaveMissedEvents) {
        mayHaveMissedEvents = false;
        callbackRef.current();
      }
    };
    const handleDisconnect = () => {
      mayHaveMissedEvents = true;
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);
}
