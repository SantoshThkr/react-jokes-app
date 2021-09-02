import { prisma } from '../db/prisma';
import type { DashboardSummary } from '../types/dashboard';
import { startOfUtcDay } from '../utils/date';
import { countActiveUsers } from './presenceService';

export async function getSummary(now = new Date()): Promise<DashboardSummary> {
  const periodStart = startOfUtcDay(now);

  const [ordersToday, revenue, errorsToday] = await prisma.$transaction([
    prisma.order.count({ where: { createdAt: { gte: periodStart } } }),
    prisma.order.aggregate({
      _sum: { amount: true },
      where: { status: 'COMPLETED', completedAt: { gte: periodStart } },
    }),
    prisma.event.count({ where: { type: 'SYSTEM_WARNING', createdAt: { gte: periodStart } } }),
  ]);

  return {
    activeUsers: countActiveUsers(),
    ordersToday,
    revenueToday: revenue._sum.amount?.toNumber() ?? 0,
    errorsToday,
    periodStart,
    generatedAt: now,
  };
}
