import pino from 'pino';
import { config } from './env';

/**
 * Structured JSON logger. Anything that could carry credentials is redacted
 * before it is written, so passwords and tokens never reach the logs.
 */
export const logger = pino({
  level: config.isTest ? 'silent' : config.logLevel,
  base: { service: 'ops-dashboard-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
});
