import type { EventType, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface RecordEventInput {
  type: EventType;
  message: string;
  userId?: string | null;
  metadata?: Prisma.InputJsonObject;
}

/** Persist an activity event. Accepts a transaction client so callers can keep writes atomic. */
export function recordEvent(input: RecordEventInput, db: Prisma.TransactionClient = prisma) {
  return db.event.create({ data: input });
}
