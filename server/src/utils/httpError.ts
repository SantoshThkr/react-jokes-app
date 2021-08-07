export interface ErrorDetail {
  path: string;
  message: string;
}

/**
 * An error that is safe to show to API clients. Anything that is *not* an
 * HttpError is treated as an unexpected failure and reported as a generic 500.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message = 'Bad request', details?: ErrorDetail[]) =>
  new HttpError(400, message, details);
export const unauthorized = (message = 'Authentication required') => new HttpError(401, message);
export const forbidden = (message = 'You do not have permission to perform this action') =>
  new HttpError(403, message);
export const notFound = (message = 'Resource not found') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
