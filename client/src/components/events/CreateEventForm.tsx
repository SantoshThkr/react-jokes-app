import type { FormEvent } from 'react';
import { useState } from 'react';
import { getErrorMessage } from '../../api/client';
import { createEvent } from '../../api/eventsApi';
import type { ActivityEvent, EventType } from '../../types/events';
import { EVENT_TYPES } from '../../types/events';
import { formatEnumLabel } from '../../utils/format';

interface CreateEventFormProps {
  onCreated: (event: ActivityEvent) => void;
}

export function CreateEventForm({ onCreated }: CreateEventFormProps) {
  const [type, setType] = useState<EventType>('SYSTEM_WARNING');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setError('Message is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createEvent({ type, message: message.trim() });
      setMessage('');
      onCreated(created);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create event'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel inline-form" onSubmit={handleSubmit} noValidate aria-labelledby="create-event-heading">
      <h2 id="create-event-heading">Create test event</h2>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="inline-form__fields">
        <div className="form-field">
          <label htmlFor="event-type">Type</label>
          <select id="event-type" value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {EVENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {formatEnumLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field inline-form__grow">
          <label htmlFor="event-message">Message</label>
          <input
            id="event-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            required
          />
        </div>
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create event'}
        </button>
      </div>
    </form>
  );
}
