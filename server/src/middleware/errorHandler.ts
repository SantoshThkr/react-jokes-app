import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { logger } from '../config/logger';
import { HttpError } from '../utils/httpError';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route ${req.method} ${req.path} not found`));
};

/** Errors raised by express.json() carry an HTTP status and a `type`. */
function isBodyParserError(err: unknown): err is { status: number; type: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    typeof (err as { status?: unknown }).status === 'number'
  );
}

/**
 * Map known failure types to safe client errors. Anything unrecognised
 * becomes a generic 500.
 */
function toHttpError(err: unknown): HttpError | null {
  if (err instanceof HttpError) return err;

  if (isBodyParserError(err)) {
    if (err.type === 'entity.parse.failed') return new HttpError(400, 'Malformed JSON body');
    if (err.type === 'entity.too.large') return new HttpError(413, 'Request body too large');
    if (err.status >= 400 && err.status < 500) return new HttpError(err.status, 'Invalid request body');
  }

  // Services handle expected cases explicitly; these are safety nets for races
  // (e.g. a row deleted between two queries) so they never surface as a 500.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return new HttpError(404, 'Resource not found');
    if (err.code === 'P2002') return new HttpError(409, 'Resource already exists');
  }

  return null;
}

/**
 * Converts every error into the `{ error: { message } }` response shape.
 * Unexpected errors are logged in full but only a generic message is returned,
 * so stack traces, SQL and internal paths never reach the client.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const httpError = toHttpError(err);

  if (!httpError) {
    logger.error({ err, reqId: req.id }, 'Unhandled error');
    res.status(500).json({ error: { message: 'Internal server error' } });
    return;
  }

  if (httpError.status >= 500) {
    logger.error({ err, reqId: req.id }, httpError.message);
  }
  res.status(httpError.status).json({
    error: {
      message: httpError.message,
      ...(httpError.details && { details: httpError.details }),
    },
  });
};
