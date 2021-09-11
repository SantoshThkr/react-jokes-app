import type { ApiSuccess, Page } from '../types/api';
import type { ActivityEvent, EventType } from '../types/events';
import { apiClient } from './client';

export interface EventQuery {
  page?: number;
  pageSize?: number;
  type?: EventType;
}

export interface NewEvent {
  type: EventType;
  message: string;
}

export async function fetchEvents(query: EventQuery = {}): Promise<Page<ActivityEvent>> {
  const response = await apiClient.get<ApiSuccess<Page<ActivityEvent>>>('/events', {
    params: query,
  });
  return response.data.data;
}

export async function createEvent(event: NewEvent): Promise<ActivityEvent> {
  const response = await apiClient.post<ApiSuccess<ActivityEvent>>('/events', event);
  return response.data.data;
}
