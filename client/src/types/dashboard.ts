export interface DashboardSummary {
  activeUsers: number;
  ordersToday: number;
  revenueToday: number;
  errorsToday: number;
  periodStart: string;
  generatedAt: string;
}

export const SERVICE_NAMES = ['API', 'DATABASE', 'PAYMENTS', 'NOTIFICATIONS'] as const;
export type ServiceName = (typeof SERVICE_NAMES)[number];

export const SERVICE_STATES = ['ONLINE', 'DEGRADED', 'OFFLINE'] as const;
export type ServiceState = (typeof SERVICE_STATES)[number];

export interface SystemStatus {
  service: ServiceName;
  status: ServiceState;
  updatedAt: string;
  updatedBy: { id: string; name: string } | null;
}
