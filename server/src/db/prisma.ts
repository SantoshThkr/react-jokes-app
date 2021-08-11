import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

export const prisma = new PrismaClient({
  log: config.isProduction ? ['error'] : ['warn', 'error'],
});
