import type { Server } from 'socket.io';
import { logger } from '../config/logger';
import { getSummary } from '../services/dashboardService';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socket';

export const DASHBOARD_ROOM = 'dashboard';

export type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

let io: RealtimeServer | null = null;

export function attachRealtime(server: RealtimeServer | null) {
  io = server;
}

/**
 * Broadcast to every authenticated dashboard connection. A no-op when no
 * Socket.IO server is attached (e.g. HTTP-only tests or scripts).
 */
export function publish<E extends keyof ServerToClientEvents>(
  event: E,
  ...payload: Parameters<ServerToClientEvents[E]>
) {
  io?.to(DASHBOARD_ROOM).emit(event, ...payload);
}

/**
 * Recompute and broadcast the summary after a change that affects it. Runs
 * after the change is committed and never fails the request that caused it.
 */
export async function publishSummary() {
  if (!io) return;
  try {
    publish('summary.updated', await getSummary());
  } catch (err) {
    logger.error({ err }, 'Failed to broadcast dashboard summary');
  }
}
