import { useCallback, useEffect, useReducer, useRef } from 'react';
import { getErrorMessage } from '../api/client';
import { fetchSummary, fetchSystemStatus } from '../api/dashboardApi';
import { fetchEvents } from '../api/eventsApi';
import { ACTIVITY_LIMIT, dashboardReducer, initialDashboardState } from '../utils/dashboardState';
import { useResyncOnConnect, useSocketEvent } from './useSocket';

/** Initial dashboard state comes from REST; Socket.IO pushes live updates on top of it. */
export function useDashboard() {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    dispatch({ type: 'load/start' });
    try {
      const [summary, systemStatus, events] = await Promise.all([
        fetchSummary(),
        fetchSystemStatus(),
        fetchEvents({ pageSize: ACTIVITY_LIMIT }),
      ]);
      if (requestId !== latestRequest.current) return;
      dispatch({ type: 'load/success', summary, systemStatus, activity: events.items });
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      dispatch({ type: 'load/failure', error: getErrorMessage(error, 'Unable to load dashboard') });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Events sent while we were disconnected are lost; refresh the snapshot.
  useResyncOnConnect(load);

  useSocketEvent('activity.created', (event) => dispatch({ type: 'activity/received', event }));
  useSocketEvent('summary.updated', (summary) => dispatch({ type: 'summary/updated', summary }));
  useSocketEvent('presence.updated', ({ activeUsers }) =>
    dispatch({ type: 'presence/updated', activeUsers }),
  );
  useSocketEvent('system.status.changed', (status) => dispatch({ type: 'status/changed', status }));

  return { state, dispatch, reload: load };
}
