import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '../types/events';
import { ACTIVITY_LIMIT, dashboardReducer, initialDashboardState } from './dashboardState';

const event = (id: number): ActivityEvent => ({
  id: `e${id}`,
  type: 'ORDER_CREATED',
  message: `Order #${id} created`,
  metadata: null,
  createdAt: new Date(2021, 8, 1, 10, id).toISOString(),
  user: null,
});

describe('dashboardReducer', () => {
  it('adds new activity to the top and caps the feed', () => {
    let state = dashboardReducer(initialDashboardState, {
      type: 'load/success',
      summary: { activeUsers: 1, ordersToday: 0, revenueToday: 0, errorsToday: 0, periodStart: '', generatedAt: '' },
      systemStatus: [],
      activity: Array.from({ length: ACTIVITY_LIMIT }, (_, i) => event(i)),
    });

    state = dashboardReducer(state, { type: 'activity/received', event: event(999) });

    expect(state.activity).toHaveLength(ACTIVITY_LIMIT);
    expect(state.activity[0].id).toBe('e999');
  });

  it('ignores duplicate events', () => {
    const first = dashboardReducer(initialDashboardState, { type: 'activity/received', event: event(1) });
    const second = dashboardReducer(first, { type: 'activity/received', event: event(1) });
    expect(second).toBe(first);
  });

  it('keeps showing existing data when a background refresh fails', () => {
    const loaded = dashboardReducer(initialDashboardState, {
      type: 'load/success',
      summary: { activeUsers: 1, ordersToday: 2, revenueToday: 3, errorsToday: 0, periodStart: '', generatedAt: '' },
      systemStatus: [],
      activity: [],
    });
    const failed = dashboardReducer(loaded, { type: 'load/failure', error: 'boom' });
    expect(failed.status).toBe('ready');
    expect(failed.summary?.ordersToday).toBe(2);
  });
});
