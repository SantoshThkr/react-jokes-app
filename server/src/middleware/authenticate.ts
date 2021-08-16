import type { Request, RequestHandler } from 'express';
import { logger } from '../config/logger';
import { authenticateToken } from '../services/authService';
import type { PublicUser } from '../types/user';
import { unauthorized } from '../utils/httpError';

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/** Requires a valid `Authorization: Bearer <jwt>` header; responds 401 otherwise. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    throw unauthorized();
  }

  const session = await authenticateToken(token);
  if (!session) {
    logger.warn({ reqId: req.id, path: req.path }, 'Authentication failed: invalid or expired token');
    throw unauthorized('Invalid or expired token');
  }

  req.user = session.user;
  next();
};

/** The authenticated user for a request that passed `authenticate`. */
export function getAuthUser(req: Request): PublicUser {
  if (!req.user) {
    throw unauthorized();
  }
  return req.user;
}
