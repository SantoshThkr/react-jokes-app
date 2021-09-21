import type { OrderStatus } from '../../types/orders';
import type { StatusTone } from '../common/StatusIndicator';
import { StatusIndicator } from '../common/StatusIndicator';

const TONES: Record<OrderStatus, StatusTone> = {
  PENDING: 'neutral',
  PROCESSING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusIndicator tone={TONES[status]} label={status} />;
}
