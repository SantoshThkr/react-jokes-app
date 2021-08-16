import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import type { PublicUser } from '../types/user';

/** Prisma select that can never leak the password hash. */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export function findUserById(id: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}
