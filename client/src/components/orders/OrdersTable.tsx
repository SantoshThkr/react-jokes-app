import { useState } from 'react';
import { getErrorMessage } from '../../api/client';
import { updateOrderStatus } from '../../api/ordersApi';
import type { Order, OrderStatus } from '../../types/orders';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { OrderStatusBadge } from './OrderStatusBadge';

const ACTION_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Reopen',
  PROCESSING: 'Start processing',
  COMPLETED: 'Complete',
  CANCELLED: 'Cancel',
};

interface OrdersTableProps {
  orders: Order[];
  busy: boolean;
  canManage: boolean;
  onOrderUpdated: (order: Order) => void;
}

export function OrdersTable({ orders, busy, canManage, onOrderUpdated }: OrdersTableProps) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(order: Order, status: OrderStatus) {
    setPendingId(order.id);
    setError(null);
    try {
      onOrderUpdated(await updateOrderStatus(order.id, status));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update order'));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="table-wrapper">
        <table className="data-table" aria-busy={busy}>
          <caption className="visually-hidden">Orders</caption>
          <thead>
            <tr>
              <th scope="col">Order ID</th>
              <th scope="col">Customer</th>
              <th scope="col" className="data-table__numeric">
                Amount
              </th>
              <th scope="col">Status</th>
              <th scope="col">Created at</th>
              {canManage && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.customerName}</td>
                <td className="data-table__numeric">{formatCurrency(order.amount)}</td>
                <td>
                  <OrderStatusBadge status={order.status} />
                </td>
                <td>
                  <time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time>
                </td>
                {canManage && (
                  <td>
                    {order.nextStatuses.length > 0 ? (
                      <div className="action-group">
                        {order.nextStatuses.map((status) => (
                          <button
                            key={status}
                            type="button"
                            className="button button--secondary button--small"
                            disabled={pendingId === order.id}
                            onClick={() => changeStatus(order, status)}
                            aria-label={`${ACTION_LABELS[status]} order #${order.id}`}
                          >
                            {ACTION_LABELS[status]}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
