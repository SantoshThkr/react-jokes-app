import type { DashboardSummary, SystemStatus } from './dashboard';
import type { ActivityEvent } from './events';
import type { Order } from './orders';

/** Messages pushed by the server to authenticated dashboard clients. */
export interface ServerToClientEvents {
  'activity.created': (event: ActivityEvent) => void;
  'order.created': (order: Order) => void;
  'order.updated': (order: Order) => void;
  'system.status.changed': (status: SystemStatus) => void;
  'summary.updated': (summary: DashboardSummary) => void;
  'presence.updated': (presence: { activeUsers: number }) => void;
}

export type ServerEventName = keyof ServerToClientEvents;
