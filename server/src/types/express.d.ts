import type { PublicUser } from './user';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. */
      user?: PublicUser;
    }
  }
}

export {};
