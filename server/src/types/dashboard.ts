export interface DashboardSummary {
  activeUsers: number;
  ordersToday: number;
  revenueToday: number;
  errorsToday: number;
  /** Start of the UTC day the "today" figures cover. */
  periodStart: Date;
  generatedAt: Date;
}
