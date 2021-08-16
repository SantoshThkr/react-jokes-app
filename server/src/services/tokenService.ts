import jwt from 'jsonwebtoken';
import { config } from '../config/env';

const ALGORITHM = 'HS256';

export interface AccessTokenClaims {
  /** User id. Role and profile data are loaded from the database per request. */
  sub: string;
  exp: number;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({}, config.jwt.secret, {
    algorithm: ALGORITHM,
    subject: userId,
    expiresIn: config.jwt.expiresIn,
  });
}

/** Returns the token claims, or null if the token is invalid or expired. */
export function verifyAccessToken(token: string): AccessTokenClaims | null {
  try {
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: [ALGORITHM] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || !payload.exp) {
      return null;
    }
    return { sub: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}
