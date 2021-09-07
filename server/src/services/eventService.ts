import type { EventType, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import type { EventDto } from '../types/event';
import type { Page } from '../utils/pagination';
import { buildPage, toSkipTake } from '../utils/pagination';
import type { CreateEventInput, ListEventsQuery } from '../validators/eventValidators';

export interface RecordEventInput {
  type: EventType;
  message: string;
  userId?: string | null;
  metadata?: Prisma.InputJsonObject;
}

const eventSelect = {
  id: true,
  type: true,
  message: true,
  metadata: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
} satisfies Prisma.EventSelect;

/**
 * Persist an activity event. Accepts a transaction client so callers can keep
 * the event atomic with the change it describes.
 */
export function recordEvent(
  input: RecordEventInput,
  db: Prisma.TransactionClient = prisma,
): Promise<EventDto> {
  return db.event.create({ data: input, select: eventSelect });
}

export async function listEvents(query: ListEventsQuery): Promise<Page<EventDto>> {
  const where: Prisma.EventWhereInput = query.type ? { type: query.type } : {};

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      select: eventSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...toSkipTake(query),
    }),
    prisma.event.count({ where }),
  ]);

  return buildPage(events, total, query);
}

export function createEvent(input: CreateEventInput, actorId: string): Promise<EventDto> {
  return recordEvent({ ...input, userId: actorId });
}
