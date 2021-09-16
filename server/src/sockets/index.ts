import type http from 'node:http';
import { Server } from 'socket.io';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { authenticateToken } from '../services/authService';
import { countActiveUsers, releaseConnection, trackConnection } from '../services/presenceService';
import type { RealtimeServer } from './realtime';
import { attachRealtime, DASHBOARD_ROOM, publish } from './realtime';

// setTimeout overflows above ~24.8 days.
const MAX_TIMEOUT_MS = 2_147_483_647;

export function createSocketServer(httpServer: http.Server): RealtimeServer {
  const io: RealtimeServer = new Server(httpServer, {
    cors: { origin: config.clientUrls },
    serveClient: false,
  });

  // Reject the handshake unless it carries a valid JWT: anonymous clients never
  // join the dashboard room and so never receive protected events.
  io.use(async (socket, next) => {
    const token: unknown = socket.handshake.auth?.token;
    const session = typeof token === 'string' ? await authenticateToken(token) : null;
    if (!session) {
      logger.warn({ socketId: socket.id, ip: socket.handshake.address }, 'Socket authentication failed');
      next(new Error('Unauthorized'));
      return;
    }

    socket.data.user = session.user;
    // A socket must not outlive the token it authenticated with.
    const expiresInMs = session.expiresAt * 1000 - Date.now();
    const expiryTimer = setTimeout(() => {
      logger.info({ userId: session.user.id, socketId: socket.id }, 'Socket token expired');
      socket.disconnect(true);
    }, Math.min(expiresInMs, MAX_TIMEOUT_MS));
    socket.once('disconnect', () => clearTimeout(expiryTimer));
    next();
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    void socket.join(DASHBOARD_ROOM);
    logger.info({ userId: user.id, socketId: socket.id }, 'Socket connected');

    if (trackConnection(user.id)) {
      publish('presence.updated', { activeUsers: countActiveUsers() });
    }

    socket.on('disconnect', (reason) => {
      logger.info({ userId: user.id, socketId: socket.id, reason }, 'Socket disconnected');
      if (releaseConnection(user.id)) {
        publish('presence.updated', { activeUsers: countActiveUsers() });
      }
    });
  });

  attachRealtime(io);
  return io;
}
