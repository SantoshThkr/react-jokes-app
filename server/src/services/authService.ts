import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../db/prisma';
import { publish } from '../sockets/realtime';
import type { PublicUser } from '../types/user';
import { conflict, unauthorized } from '../utils/httpError';
import type { LoginInput, RegisterInput } from '../validators/authValidators';
import { recordEvent } from './eventService';
import { signAccessToken, verifyAccessToken } from './tokenService';
import { findUserById, publicUserSelect } from './userService';

export interface AuthResult {
  user: PublicUser;
  token: string;
}

const INVALID_CREDENTIALS = 'Invalid email or password';

// Compared against when the email is unknown, so a failed login takes the same
// time whether or not the account exists (prevents user enumeration).
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash('dummy-password', config.bcryptRounds));

export async function register(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

  try {
    // Self-registration always creates a VIEWER; admins are promoted explicitly.
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: 'VIEWER' },
      select: publicUserSelect,
    });
    logger.info({ userId: user.id }, 'User registered');
    return { user, token: signAccessToken(user.id) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('An account with this email already exists');
    }
    throw err;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? (await getDummyHash()),
  );

  if (!user || !passwordMatches) {
    logger.warn({ email: input.email }, 'Authentication failed: invalid credentials');
    throw unauthorized(INVALID_CREDENTIALS);
  }

  const loginEvent = await recordEvent({
    type: 'USER_LOGIN',
    message: `${user.name} signed in`,
    userId: user.id,
  });
  publish('activity.created', loginEvent);
  logger.info({ userId: user.id }, 'User signed in');

  const { passwordHash: _passwordHash, ...publicUser } = user;
  return { user: publicUser, token: signAccessToken(user.id) };
}

export interface AuthenticatedSession {
  user: PublicUser;
  /** Token expiry as a Unix timestamp (seconds). */
  expiresAt: number;
}

/**
 * Resolve a bearer token to its user. Shared by the HTTP middleware and the
 * Socket.IO handshake so both transports apply identical rules. The user is
 * loaded fresh so deleted accounts and role changes take effect immediately.
 */
export async function authenticateToken(token: string): Promise<AuthenticatedSession | null> {
  const claims = verifyAccessToken(token);
  if (!claims) return null;

  const user = await findUserById(claims.sub);
  return user ? { user, expiresAt: claims.exp } : null;
}
