import type { ActivityEvent } from '../../types/events';
import { formatDateTime } from '../../utils/format';
import { EventTypeBadge } from './EventTypeBadge';

interface EventsTableProps {
  events: ActivityEvent[];
  busy: boolean;
}

export function EventsTable({ events, busy }: EventsTableProps) {
  return (
    <div className="table-wrapper">
      <table className="data-table" aria-busy={busy}>
        <caption className="visually-hidden">Events</caption>
        <thead>
          <tr>
            <th scope="col">Event</th>
            <th scope="col">Message</th>
            <th scope="col">Type</th>
            <th scope="col">Created at</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td className="text-muted">{event.user ? `By ${event.user.name}` : 'System'}</td>
              <td>{event.message}</td>
              <td>
                <EventTypeBadge type={event.type} />
              </td>
              <td>
                <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
