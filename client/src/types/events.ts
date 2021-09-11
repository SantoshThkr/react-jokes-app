export const EVENT_TYPES = [
  'ORDER_CREATED',
  'ORDER_COMPLETED',
  'USER_LOGIN',
  'PAYMENT_COMPLETED',
  'SYSTEM_WARNING',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface ActivityEvent {
  id: string;
  type: EventType;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string } | null;
}
