import type { EventType, Prisma } from '@prisma/client';

export interface EventDto {
  id: string;
  type: EventType;
  message: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  user: { id: string; name: string } | null;
}
