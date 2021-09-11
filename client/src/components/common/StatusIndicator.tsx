import { formatEnumLabel } from '../../utils/format';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

interface StatusIndicatorProps {
  tone: StatusTone;
  label: string;
}

/** Coloured dot plus text, so status never depends on colour alone. */
export function StatusIndicator({ tone, label }: StatusIndicatorProps) {
  return (
    <span className={`status-indicator status-indicator--${tone}`}>
      <span className="status-indicator__dot" aria-hidden="true" />
      {formatEnumLabel(label)}
    </span>
  );
}
