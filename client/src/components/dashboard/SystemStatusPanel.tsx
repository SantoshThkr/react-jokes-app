import { memo, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import { updateSystemStatus } from '../../api/dashboardApi';
import type { ServiceName, ServiceState, SystemStatus } from '../../types/dashboard';
import { SERVICE_STATES } from '../../types/dashboard';
import { formatEnumLabel } from '../../utils/format';
import type { StatusTone } from '../common/StatusIndicator';
import { StatusIndicator } from '../common/StatusIndicator';

const SERVICE_LABELS: Record<ServiceName, string> = {
  API: 'API',
  DATABASE: 'Database',
  PAYMENTS: 'Payments',
  NOTIFICATIONS: 'Notifications',
};

const TONES: Record<ServiceState, StatusTone> = {
  ONLINE: 'success',
  DEGRADED: 'warning',
  OFFLINE: 'danger',
};

interface SystemStatusPanelProps {
  statuses: SystemStatus[];
  canManage: boolean;
  onStatusUpdated: (status: SystemStatus) => void;
}

export const SystemStatusPanel = memo(function SystemStatusPanel({
  statuses,
  canManage,
  onStatusUpdated,
}: SystemStatusPanelProps) {
  const [pending, setPending] = useState<ServiceName | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(service: ServiceName, status: ServiceState) {
    setPending(service);
    setError(null);
    try {
      onStatusUpdated(await updateSystemStatus(service, status));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update status'));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="panel" aria-labelledby="system-status-heading">
      <h2 id="system-status-heading">System status</h2>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <ul className="status-list">
        {statuses.map((item) => {
          const label = SERVICE_LABELS[item.service];
          return (
            <li key={item.service} className="status-list__item">
              <span className="status-list__name">{label}</span>
              <StatusIndicator tone={TONES[item.status]} label={item.status} />
              {canManage && (
                <>
                  <label className="visually-hidden" htmlFor={`status-${item.service}`}>
                    Set {label} status
                  </label>
                  <select
                    id={`status-${item.service}`}
                    className="status-list__select"
                    value={item.status}
                    disabled={pending === item.service}
                    onChange={(e) => handleChange(item.service, e.target.value as ServiceState)}
                  >
                    {SERVICE_STATES.map((state) => (
                      <option key={state} value={state}>
                        {formatEnumLabel(state)}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
});
