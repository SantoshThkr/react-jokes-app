import type { DashboardSummary } from './dashboard';
import type { EventDto } from './event';
import type { OrderDto } from './order';
import type { SystemStatusDto } from './systemStatus';
import type { PublicUser } from './user';

/** Every message the server pushes to dashboard clients. */
export interface ServerToClientEvents {
  'activity.created': (event: EventDto) => void;
  'order.created': (order: OrderDto) => void;
  'order.updated': (order: OrderDto) => void;
  'system.status.changed': (status: SystemStatusDto) => void;
  'summary.updated': (summary: DashboardSummary) => void;
  'presence.updated': (presence: { activeUsers: number }) => void;
}

/** Clients only listen; they change data through the REST API. */
export type ClientToServerEvents = Record<string, never>;

export interface SocketData {
  user: PublicUser;
}
