import type { EventType } from '../../types/events';
import { formatEnumLabel } from '../../utils/format';

export function EventTypeBadge({ type }: { type: EventType }) {
  return <span className={`badge badge--${type.toLowerCase().replace(/_/g, '-')}`}>{formatEnumLabel(type)}</span>;
}
