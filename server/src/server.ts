import http from 'node:http';
import { createApp } from './app';
import { config } from './config/env';
import { logger } from './config/logger';
import { prisma } from './db/prisma';
import { createSocketServer } from './sockets';

async function start() {
  await prisma.$connect();

  const app = createApp();
  const server = http.createServer(app);
  const io = createSocketServer(server);

  server.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'API server listening');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    // Closing Socket.IO also closes the underlying HTTP server.
    void io.close(() => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
    // Do not hang forever on keep-alive connections.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

start().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
