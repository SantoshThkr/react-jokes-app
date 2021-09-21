import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchOrders } from '../api/ordersApi';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { Pagination } from '../components/common/Pagination';
import { CreateOrderForm } from '../components/orders/CreateOrderForm';
import { OrdersTable } from '../components/orders/OrdersTable';
import { useAuth } from '../hooks/useAuth';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useResyncOnConnect, useSocketEvent } from '../hooks/useSocket';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import type { Order } from '../types/orders';
import { ORDER_STATUSES } from '../types/orders';
import { formatEnumLabel } from '../utils/format';
import { readEnum, readPage, withParams } from '../utils/searchParams';

const PAGE_SIZE = 20;

export default function Orders() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [params, setParams] = useSearchParams();
  const page = readPage(params);
  const status = readEnum(params, 'status', ORDER_STATUSES);
  const search = params.get('search') ?? '';

  // The input updates instantly; the URL (and therefore the request) follows once typing pauses.
  const [searchInput, setSearchInput] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (search !== syncedSearch) {
    // The URL changed from outside the input (back/forward navigation).
    setSyncedSearch(search);
    setSearchInput(search);
  }
  const typedSearch = searchInput.trim();
  const debouncedSearch = useDebouncedValue(typedSearch, 300);
  useEffect(() => {
    if (debouncedSearch === typedSearch && debouncedSearch !== search) {
      setParams((current) => withParams(current, { search: debouncedSearch, page: 1 }), { replace: true });
    }
  }, [debouncedSearch, typedSearch, search, setParams]);

  const { page: result, loading, error, reload, updateItems, prependItem } = usePaginatedQuery(fetchOrders, {
    page,
    pageSize: PAGE_SIZE,
    status,
    search: search || undefined,
  });

  const handleOrderUpdated = useCallback(
    (order: Order) => updateItems((items) => items.map((item) => (item.id === order.id ? order : item))),
    [updateItems],
  );

  useResyncOnConnect(reload);
  useSocketEvent('order.updated', handleOrderUpdated);
  useSocketEvent('order.created', (order) => {
    // New orders are newest, so they only belong on the first, unsearched page.
    if (page === 1 && !search && (!status || order.status === status)) {
      prependItem(order, (item) => item.id);
    }
  });

  return (
    <>
      <div className="page-header">
        <h1>Orders</h1>
      </div>

      {isAdmin && <CreateOrderForm onCreated={reload} />}

      <section className="panel" aria-labelledby="orders-list-heading">
        <h2 id="orders-list-heading" className="visually-hidden">
          Order list
        </h2>
        <div className="filters">
          <div className="form-field">
            <label htmlFor="orders-search">Search</label>
            <input
              id="orders-search"
              type="search"
              placeholder="Customer or order #"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="orders-status">Status</label>
            <select
              id="orders-status"
              value={status ?? ''}
              onChange={(e) => setParams(withParams(params, { status: e.target.value, page: 1 }))}
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {formatEnumLabel(value)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={reload} />}
        {!result && loading && <LoadingState label="Loading orders…" />}
        {result && result.items.length === 0 && <p className="empty-state">No orders match these filters.</p>}
        {result && result.items.length > 0 && (
          <>
            <OrdersTable
              orders={result.items}
              busy={loading}
              canManage={isAdmin}
              onOrderUpdated={handleOrderUpdated}
            />
            <Pagination
              label="Orders"
              pagination={result.pagination}
              onPageChange={(next) => setParams(withParams(params, { page: next }))}
            />
          </>
        )}
      </section>
    </>
  );
}
