import { vi } from 'vitest';
import type { DashboardSocket } from '../context/SocketContext';

type Listener = (...args: unknown[]) => void;

class Emitter {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return this;
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  /** Simulate the server (or Socket.IO itself) emitting an event. */
  trigger(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }

  listenerCount(event: string) {
    return this.listeners.get(event)?.size ?? 0;
  }
}

/** Minimal stand-in for a socket.io-client Socket that tests can drive. */
export class FakeSocket extends Emitter {
  connected = false;
  active = false;
  io = new Emitter();
  connect = vi.fn(() => {
    this.active = true;
    return this;
  });
  disconnect = vi.fn(() => {
    this.active = false;
    this.connected = false;
    return this;
  });

  simulateConnect() {
    this.connected = true;
    this.trigger('connect');
  }

  asSocket() {
    return this as unknown as DashboardSocket;
  }
}
