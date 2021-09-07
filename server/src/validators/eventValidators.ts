import { EventType } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema } from './commonValidators';

export const listEventsQuerySchema = paginationSchema.extend({
  type: z.nativeEnum(EventType).optional(),
});

const metadataValue = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

export const createEventSchema = z.object({
  type: z.nativeEnum(EventType),
  message: z.string().trim().min(1, 'Message is required').max(500),
  metadata: z
    .record(z.string().max(50), metadataValue)
    .refine((value) => Object.keys(value).length <= 20, 'Metadata can have at most 20 keys')
    .optional(),
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
