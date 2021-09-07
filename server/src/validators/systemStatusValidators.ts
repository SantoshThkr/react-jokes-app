import { ServiceName, ServiceState } from '@prisma/client';
import { z } from 'zod';

export const serviceParamsSchema = z.object({
  // Accept /system-status/payments as well as /system-status/PAYMENTS.
  service: z.preprocess(
    (value) => (typeof value === 'string' ? value.toUpperCase() : value),
    z.nativeEnum(ServiceName),
  ),
});

export const updateSystemStatusSchema = z.object({
  status: z.nativeEnum(ServiceState),
});

export type UpdateSystemStatusInput = z.infer<typeof updateSystemStatusSchema>;
