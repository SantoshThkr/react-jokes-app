import type { Prisma, ServiceName, ServiceState } from '@prisma/client';
import { ServiceName as ServiceNames } from '@prisma/client';
import { logger } from '../config/logger';
import { prisma } from '../db/prisma';
import type { EventDto } from '../types/event';
import type { SystemStatusDto } from '../types/systemStatus';
import { recordEvent } from './eventService';

const SERVICE_LABELS: Record<ServiceName, string> = {
  API: 'API',
  DATABASE: 'Database',
  PAYMENTS: 'Payments',
  NOTIFICATIONS: 'Notifications',
};

// Display order follows the enum declaration order.
const SERVICE_ORDER = Object.values(ServiceNames);

const statusSelect = {
  service: true,
  status: true,
  updatedAt: true,
  updatedBy: { select: { id: true, name: true } },
} satisfies Prisma.SystemStatusSelect;

export async function listSystemStatus(): Promise<SystemStatusDto[]> {
  const rows = await prisma.systemStatus.findMany({ select: statusSelect });
  return rows.sort((a, b) => SERVICE_ORDER.indexOf(a.service) - SERVICE_ORDER.indexOf(b.service));
}

export interface StatusUpdateResult {
  status: SystemStatusDto;
  event: EventDto | null;
  changed: boolean;
}

export async function updateSystemStatus(
  service: ServiceName,
  status: ServiceState,
  actorId: string,
): Promise<StatusUpdateResult> {
  return prisma.$transaction(async (tx) => {
    const previous = await tx.systemStatus.findUnique({ where: { service } });
    if (previous?.status === status) {
      const unchanged = await tx.systemStatus.findUniqueOrThrow({
        where: { service },
        select: statusSelect,
      });
      return { status: unchanged, event: null, changed: false };
    }

    const updated = await tx.systemStatus.upsert({
      where: { service },
      update: { status, updatedById: actorId },
      create: { service, status, updatedById: actorId },
      select: statusSelect,
    });

    const label = SERVICE_LABELS[service];
    const event =
      status === 'ONLINE'
        ? null
        : await recordEvent(
            {
              type: 'SYSTEM_WARNING',
              message: `${label} is ${status.toLowerCase()}`,
              userId: actorId,
              metadata: { service, status, previousStatus: previous?.status ?? null },
            },
            tx,
          );

    logger.info(
      { service, from: previous?.status, to: status, actorId },
      'System status changed',
    );
    return { status: updated, event, changed: true };
  });
}
