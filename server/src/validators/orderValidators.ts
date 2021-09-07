import { OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema } from './commonValidators';

export const orderIdParamsSchema = z.object({
  id: z.coerce.number().int().positive('Order id must be a positive integer'),
});

export const listOrdersQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(OrderStatus).optional(),
  search: z.string().trim().max(120).optional().transform((value) => value || undefined),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required').max(120),
  amount: z.coerce
    .number()
    .positive('Amount must be greater than 0')
    .max(9_999_999_999.99)
    .multipleOf(0.01, 'Amount can have at most 2 decimal places'),
  // New orders start in the pipeline; completion happens through a status update.
  status: z.enum([OrderStatus.PENDING, OrderStatus.PROCESSING]).default(OrderStatus.PENDING),
});

export const updateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
