import type { OrderStatus } from '@prisma/client';

export interface OrderDto {
  id: number;
  customerName: string;
  amount: number;
  status: OrderStatus;
  /** Statuses this order may move to next; lets clients offer only valid actions. */
  nextStatuses: OrderStatus[];
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
