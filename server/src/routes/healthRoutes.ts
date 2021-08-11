import { Router } from 'express';
import { prisma } from '../db/prisma';

export const healthRoutes = Router();

healthRoutes.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ data: { status: 'ok', database: 'ok' } });
  } catch {
    res.status(503).json({ error: { message: 'Database unavailable' } });
  }
});
