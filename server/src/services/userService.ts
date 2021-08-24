import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import type { PublicUser } from '../types/user';
import type { Page } from '../utils/pagination';
import { buildPage, toSkipTake } from '../utils/pagination';
import type { PaginationInput } from '../validators/commonValidators';

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

export async function listUsers(pagination: PaginationInput): Promise<Page<PublicUser>> {
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(pagination),
    }),
    prisma.user.count(),
  ]);
  return buildPage(items, total, pagination);
}
