import { PrismaClient } from '@prisma/client';

// Query errors are thrown to the caller and logged once by the error handler,
// so Prisma itself only needs to report warnings.
export const prisma = new PrismaClient({ log: ['warn'] });
