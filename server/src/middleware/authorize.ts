import type { Role } from '@prisma/client';
import type { RequestHandler } from 'express';
import { logger } from '../config/logger';
import { forbidden } from '../utils/httpError';
import { getAuthUser } from './authenticate';

/**
 * Allow the request only if the authenticated user has one of `roles`.
 * Must run after `authenticate`. This is the server-side source of truth:
 * hiding buttons in the UI is a convenience, not a security control.
 */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    const user = getAuthUser(req);
    if (!roles.includes(user.role)) {
      logger.warn(
        { userId: user.id, role: user.role, method: req.method, path: req.originalUrl },
        'Authorization denied',
      );
      throw forbidden();
    }
    next();
  };
