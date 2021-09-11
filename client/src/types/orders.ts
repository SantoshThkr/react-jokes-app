export const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: number;
  customerName: string;
  amount: number;
  status: OrderStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
