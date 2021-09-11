import { useCallback, useEffect, useReducer, useRef } from 'react';
import { getErrorMessage } from '../api/client';
import { fetchSummary, fetchSystemStatus } from '../api/dashboardApi';
import { fetchEvents } from '../api/eventsApi';
import { ACTIVITY_LIMIT, dashboardReducer, initialDashboardState } from '../utils/dashboardState';

/** Initial dashboard state comes from REST; live updates are dispatched on top of it. */
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

  return { state, dispatch, reload: load };
}
