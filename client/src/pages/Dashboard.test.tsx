import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dashboardApi from '../api/dashboardApi';
import * as eventsApi from '../api/eventsApi';
import { FakeSocket } from '../test/fakeSocket';
import { adminUser, renderWithProviders, viewerUser } from '../test/renderWithProviders';
import type { DashboardSummary, SystemStatus } from '../types/dashboard';
import type { ActivityEvent } from '../types/events';
import Dashboard from './Dashboard';

vi.mock('../api/dashboardApi');
vi.mock('../api/eventsApi');

const summary: DashboardSummary = {
  activeUsers: 248,
  ordersToday: 1284,
  revenueToday: 42580,
  errorsToday: 12,
  periodStart: '2021-09-15T00:00:00.000Z',
  generatedAt: '2021-09-15T10:42:00.000Z',
};

const statuses: SystemStatus[] = [
  { service: 'API', status: 'ONLINE', updatedAt: '2021-09-15T10:00:00.000Z', updatedBy: null },
  { service: 'PAYMENTS', status: 'ONLINE', updatedAt: '2021-09-15T10:00:00.000Z', updatedBy: null },
];

const existingEvent: ActivityEvent = {
  id: 'e1',
  type: 'ORDER_CREATED',
  message: 'Order #1041 created',
  metadata: null,
  createdAt: '2021-09-15T10:39:00.000Z',
  user: null,
};

let socket: FakeSocket;

beforeEach(() => {
  socket = new FakeSocket();
  socket.connected = true;
  vi.mocked(dashboardApi.fetchSummary).mockResolvedValue(summary);
  vi.mocked(dashboardApi.fetchSystemStatus).mockResolvedValue(statuses);
  vi.mocked(eventsApi.fetchEvents).mockResolvedValue({
    items: [existingEvent],
    pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
  });
});

function renderDashboard(user = viewerUser) {
  return renderWithProviders(<Dashboard />, { auth: { user }, socket: { socket: socket.asSocket() } });
}

const card = (label: string) => screen.getByText(label).closest('.summary-card') as HTMLElement;

describe('Dashboard page', () => {
  it('renders the summary, system status and activity from the API', async () => {
    renderDashboard();

    expect(await screen.findByText('1,284')).toBeInTheDocument();
    expect(within(card('Active users')).getByText('248')).toBeInTheDocument();
    expect(within(card('Revenue')).getByText('$42,580.00')).toBeInTheDocument();
    expect(within(card('Errors')).getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'System status' })).toBeInTheDocument();
    expect(screen.getAllByText('Online')).toHaveLength(2);
    expect(screen.getByText('Order #1041 created')).toBeInTheDocument();
    expect(eventsApi.fetchEvents).toHaveBeenCalledWith({ pageSize: 50 });
  });

  it('only shows status controls to admins', async () => {
    const { unmount } = renderDashboard(viewerUser);
    await screen.findByText('1,284');
    expect(screen.queryByLabelText('Set Payments status')).not.toBeInTheDocument();
    unmount();

    renderDashboard(adminUser);
    expect(await screen.findByLabelText('Set Payments status')).toBeInTheDocument();
  });

  it('shows an error state and recovers on retry', async () => {
    vi.mocked(dashboardApi.fetchSummary).mockRejectedValueOnce(new Error('network down'));
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load dashboard');

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('1,284')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('applies real-time updates without reloading', async () => {
    renderDashboard();
    await screen.findByText('1,284');

    act(() => {
      socket.trigger('activity.created', {
        ...existingEvent,
        id: 'e2',
        message: 'Order #1042 created',
        createdAt: '2021-09-15T10:42:00.000Z',
      });
      socket.trigger('summary.updated', { ...summary, ordersToday: 1285 });
      socket.trigger('presence.updated', { activeUsers: 249 });
      socket.trigger('system.status.changed', { ...statuses[1], status: 'DEGRADED' });
    });

    const items = screen.getAllByRole('listitem').filter((li) => li.classList.contains('activity-feed__item'));
    expect(items[0]).toHaveTextContent('Order #1042 created');
    expect(items[1]).toHaveTextContent('Order #1041 created');
    expect(screen.getByText('1,285')).toBeInTheDocument();
    expect(within(card('Active users')).getByText('249')).toBeInTheDocument();
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(dashboardApi.fetchSummary).toHaveBeenCalledTimes(1);
  });

  it('refetches after the socket reconnects and cleans up listeners on unmount', async () => {
    const { unmount } = renderDashboard();
    await screen.findByText('1,284');

    await act(async () => {
      socket.trigger('disconnect', 'transport close');
      socket.simulateConnect();
    });
    expect(dashboardApi.fetchSummary).toHaveBeenCalledTimes(2);

    unmount();
    expect(socket.listenerCount('activity.created')).toBe(0);
    expect(socket.listenerCount('summary.updated')).toBe(0);
  });
});
