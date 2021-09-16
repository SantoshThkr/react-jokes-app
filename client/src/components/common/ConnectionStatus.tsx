import type { ConnectionStatus as Status } from '../../context/SocketContext';
import { useSocket } from '../../hooks/useSocket';

const LABELS: Record<Status, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
  offline: 'Offline',
};

/** Real-time connection indicator. Announced politely to screen readers when it changes. */
export function ConnectionStatus() {
  const { status, retry } = useSocket();

  return (
    <div className="connection-status">
      <span className={`connection-status__label connection-status--${status}`} role="status" aria-live="polite">
        <span className="connection-status__dot" aria-hidden="true" />
        <span className="visually-hidden">Real-time updates: </span>
        {LABELS[status]}
      </span>
      {status === 'offline' && (
        <button type="button" className="button button--secondary button--small" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}
