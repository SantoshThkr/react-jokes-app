import type { ErrorRequestHandler, RequestHandler } from 'express';
import { logger } from '../config/logger';
import { HttpError } from '../utils/httpError';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route ${req.method} ${req.path} not found`));
};

/**
 * Converts every error into the `{ error: { message } }` response shape.
 * Unexpected errors are logged in full but only a generic message is returned,
 * so stack traces, SQL and internal paths never reach the client.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logger.error({ err, reqId: req.id }, err.message);
    }
    res.status(err.status).json({
      error: { message: err.message, ...(err.details && { details: err.details }) },
    });
    return;
  }

  logger.error({ err, reqId: req.id }, 'Unhandled error');
  res.status(500).json({ error: { message: 'Internal server error' } });
};
