import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config/env';
import { logger } from '../config/logger';

/** Throttles credential endpoints per client IP to slow down brute-force attempts. */
export function createAuthRateLimiter(max = config.authRateLimit.max): RequestHandler {
  return rateLimit({
    windowMs: config.authRateLimit.windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn({ ip: req.ip, path: req.path }, 'Auth rate limit exceeded');
      res.status(429).json({
        error: { message: 'Too many attempts. Please try again later.' },
      });
    },
  });
}
