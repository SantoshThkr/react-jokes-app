import type { Role } from '@prisma/client';
import { ServiceName } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { signAccessToken } from '../src/services/tokenService';

export const app = createApp();

export const TEST_PASSWORD = 'Password123!';

/** Empty every table and restore the reference system status rows. */
export async function resetDatabase() {
  // CASCADE also empties system_status (it references users), so the
  // reference rows the migration creates are restored afterwards.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE events, orders, system_status, users RESTART IDENTITY CASCADE',
  );
  await prisma.systemStatus.createMany({
    data: Object.values(ServiceName).map((service) => ({ service, status: 'ONLINE' as const })),
  });
}

let userCounter = 0;

export async function createUser(role: Role = 'VIEWER', overrides: { email?: string; name?: string } = {}) {
  userCounter += 1;
  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? `${role.toLowerCase()} ${userCounter}`,
      email: overrides.email ?? `${role.toLowerCase()}${userCounter}@example.com`,
      passwordHash: await bcrypt.hash(TEST_PASSWORD, 4),
      role,
    },
  });
  return { user, token: signAccessToken(user.id), auth: `Bearer ${signAccessToken(user.id)}` };
}
