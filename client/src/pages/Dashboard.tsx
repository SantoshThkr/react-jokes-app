import { useCallback } from 'react';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { SystemStatusPanel } from '../components/dashboard/SystemStatusPanel';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';
import type { SystemStatus } from '../types/dashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const { state, dispatch, reload } = useDashboard();

  const handleStatusUpdated = useCallback(
    (status: SystemStatus) => dispatch({ type: 'status/changed', status }),
    [dispatch],
  );

  return (
    <>
      <div className="page-header">
        <h1>Operations Dashboard</h1>
      </div>

      {state.status === 'loading' && <LoadingState label="Loading dashboard…" />}
      {state.status === 'error' && state.error && (
        <ErrorState message={state.error} onRetry={reload} />
      )}

      {state.summary && (
        <>
          <SummaryCards summary={state.summary} />
          <div className="dashboard-grid">
            <SystemStatusPanel
              statuses={state.systemStatus}
              canManage={user?.role === 'ADMIN'}
              onStatusUpdated={handleStatusUpdated}
            />
            <ActivityFeed events={state.activity} />
          </div>
        </>
      )}
    </>
  );
}
