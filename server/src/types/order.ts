import type { OrderStatus } from '@prisma/client';

export interface OrderDto {
  id: number;
  customerName: string;
  amount: number;
  status: OrderStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
