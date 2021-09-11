import { memo } from 'react';
import type { ActivityEvent } from '../../types/events';
import { formatDateTime, formatTime } from '../../utils/format';
import { EventTypeBadge } from '../events/EventTypeBadge';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export const ActivityFeed = memo(function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <section className="panel" aria-labelledby="activity-heading">
      <h2 id="activity-heading">Recent activity</h2>
      {events.length === 0 ? (
        <p className="empty-state">No activity yet.</p>
      ) : (
        <ol className="activity-feed">
          {events.map((event) => (
            <li key={event.id} className="activity-feed__item">
              <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
                {formatTime(event.createdAt)}
              </time>
              <span className="activity-feed__message">{event.message}</span>
              <EventTypeBadge type={event.type} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
});
