import { useSearchParams } from 'react-router-dom';
import { fetchEvents } from '../api/eventsApi';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { Pagination } from '../components/common/Pagination';
import { CreateEventForm } from '../components/events/CreateEventForm';
import { EventsTable } from '../components/events/EventsTable';
import { useAuth } from '../hooks/useAuth';
import { useResyncOnConnect, useSocketEvent } from '../hooks/useSocket';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import { EVENT_TYPES } from '../types/events';
import { formatEnumLabel } from '../utils/format';
import { readEnum, readPage, withParams } from '../utils/searchParams';

const PAGE_SIZE = 25;

export default function Events() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = readPage(params);
  const type = readEnum(params, 'type', EVENT_TYPES);

  const { page: result, loading, error, reload, prependItem } = usePaginatedQuery(fetchEvents, {
    page,
    pageSize: PAGE_SIZE,
    type,
  });

  useResyncOnConnect(reload);
  useSocketEvent('activity.created', (event) => {
    if (page === 1 && (!type || event.type === type)) {
      prependItem(event, (item) => item.id);
    }
  });

  return (
    <>
      <div className="page-header">
        <h1>Events</h1>
      </div>

      {user?.role === 'ADMIN' && <CreateEventForm onCreated={reload} />}

      <section className="panel" aria-labelledby="events-list-heading">
        <h2 id="events-list-heading" className="visually-hidden">
          Event list
        </h2>
        <div className="filters">
          <div className="form-field">
            <label htmlFor="events-type">Event type</label>
            <select
              id="events-type"
              value={type ?? ''}
              onChange={(e) => setParams(withParams(params, { type: e.target.value, page: 1 }))}
            >
              <option value="">All types</option>
              {EVENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {formatEnumLabel(value)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={reload} />}
        {!result && loading && <LoadingState label="Loading events…" />}
        {result && result.items.length === 0 && <p className="empty-state">No events found.</p>}
        {result && result.items.length > 0 && (
          <>
            <EventsTable events={result.items} busy={loading} />
            <Pagination
              label="Events"
              pagination={result.pagination}
              onPageChange={(next) => setParams(withParams(params, { page: next }))}
            />
          </>
        )}
      </section>
    </>
  );
}
