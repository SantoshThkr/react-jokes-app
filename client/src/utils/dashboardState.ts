import type { DashboardSummary, SystemStatus } from '../types/dashboard';
import type { ActivityEvent } from '../types/events';

/** The feed keeps only the newest events so browser memory stays bounded. */
export const ACTIVITY_LIMIT = 50;

export interface DashboardState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  summary: DashboardSummary | null;
  systemStatus: SystemStatus[];
  activity: ActivityEvent[];
}

export type DashboardAction =
  | { type: 'load/start' }
  | {
      type: 'load/success';
      summary: DashboardSummary;
      systemStatus: SystemStatus[];
      activity: ActivityEvent[];
    }
  | { type: 'load/failure'; error: string }
  | { type: 'summary/updated'; summary: DashboardSummary }
  | { type: 'presence/updated'; activeUsers: number }
  | { type: 'status/changed'; status: SystemStatus }
  | { type: 'activity/received'; event: ActivityEvent };

export const initialDashboardState: DashboardState = {
  status: 'loading',
  error: null,
  summary: null,
  systemStatus: [],
  activity: [],
};

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'load/start':
      // A background refresh keeps showing the data we already have.
      return state.summary ? state : { ...state, status: 'loading', error: null };
    case 'load/success':
      return {
        status: 'ready',
        error: null,
        summary: action.summary,
        systemStatus: action.systemStatus,
        activity: action.activity.slice(0, ACTIVITY_LIMIT),
      };
    case 'load/failure':
      return state.summary ? state : { ...state, status: 'error', error: action.error };
    case 'summary/updated':
      return { ...state, summary: action.summary };
    case 'presence/updated':
      return state.summary
        ? { ...state, summary: { ...state.summary, activeUsers: action.activeUsers } }
        : state;
    case 'status/changed': {
      const exists = state.systemStatus.some((s) => s.service === action.status.service);
      return {
        ...state,
        systemStatus: exists
          ? state.systemStatus.map((s) => (s.service === action.status.service ? action.status : s))
          : [...state.systemStatus, action.status],
      };
    }
    case 'activity/received':
      // The same event can arrive twice (e.g. REST refresh racing a socket push).
      if (state.activity.some((e) => e.id === action.event.id)) {
        return state;
      }
      return { ...state, activity: [action.event, ...state.activity].slice(0, ACTIVITY_LIMIT) };
    default:
      return state;
  }
}
