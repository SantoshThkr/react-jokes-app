import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Socket } from 'socket.io-client';
import { io as connectClient } from 'socket.io-client';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { resetPresence } from '../src/services/presenceService';
import { createSocketServer } from '../src/sockets';
import { attachRealtime } from '../src/sockets/realtime';
import type { RealtimeServer } from '../src/sockets/realtime';
import { createUser, resetDatabase } from './helpers';

let httpServer: http.Server;
let io: RealtimeServer;
let url: string;
const clients: Socket[] = [];

beforeAll(async () => {
  httpServer = http.createServer(createApp());
  io = createSocketServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

beforeEach(async () => {
  await resetDatabase();
  resetPresence();
});

afterEach(() => {
  clients.splice(0).forEach((client) => client.disconnect());
});

afterAll(async () => {
  attachRealtime(null);
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await prisma.$disconnect();
});

function connect(token?: string): Socket {
  const client = connectClient(url, {
    auth: token ? { token } : {},
    reconnection: false,
    transports: ['websocket'],
  });
  clients.push(client);
  return client;
}

function waitFor<T = unknown>(client: Socket, event: string): Promise<T> {
  return new Promise((resolve) => client.once(event, resolve));
}

describe('Socket.IO authentication', () => {
  it('accepts a connection with a valid token', async () => {
    const { token } = await createUser('VIEWER');
    const client = connect(token);
    await waitFor(client, 'connect');
    expect(client.connected).toBe(true);
  });

  it.each([
    ['no token', undefined],
    ['an invalid token', 'not-a-real-token'],
  ])('rejects a connection with %s', async (_label, token) => {
    const client = connect(token);
    const error = await waitFor<Error>(client, 'connect_error');
    expect(error.message).toBe('Unauthorized');
    expect(client.connected).toBe(false);
  });
});

describe('Socket.IO broadcasts', () => {
  it('pushes order, activity and summary updates to connected dashboards', async () => {
    const viewer = await createUser('VIEWER');
    const admin = await createUser('ADMIN');
    const client = connect(viewer.token);
    await waitFor(client, 'connect');

    const orderCreated = waitFor<{ customerName: string }>(client, 'order.created');
    const activity = waitFor<{ type: string }>(client, 'activity.created');
    const summary = waitFor<{ ordersToday: number }>(client, 'summary.updated');

    const res = await request(httpServer)
      .post('/api/orders')
      .set('Authorization', admin.auth)
      .send({ customerName: 'Socket Co', amount: 12 });
    expect(res.status).toBe(201);

    await expect(orderCreated).resolves.toMatchObject({ customerName: 'Socket Co' });
    await expect(activity).resolves.toMatchObject({ type: 'ORDER_CREATED' });
    await expect(summary).resolves.toMatchObject({ ordersToday: 1 });
  });

  it('broadcasts system status changes', async () => {
    const viewer = await createUser('VIEWER');
    const admin = await createUser('ADMIN');
    const client = connect(viewer.token);
    await waitFor(client, 'connect');

    const changed = waitFor(client, 'system.status.changed');
    await request(httpServer)
      .put('/api/system-status/DATABASE')
      .set('Authorization', admin.auth)
      .send({ status: 'OFFLINE' });

    await expect(changed).resolves.toMatchObject({ service: 'DATABASE', status: 'OFFLINE' });
  });

  it('does not deliver events to rejected clients', async () => {
    const admin = await createUser('ADMIN');
    const intruder = connect('forged-token');
    await waitFor(intruder, 'connect_error');
    const received: string[] = [];
    intruder.onAny((event: string) => received.push(event));

    await request(httpServer)
      .post('/api/events')
      .set('Authorization', admin.auth)
      .send({ type: 'SYSTEM_WARNING', message: 'secret' });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(received).toEqual([]);
  });

  it('tracks active users across connections', async () => {
    const first = await createUser('VIEWER');
    const second = await createUser('VIEWER');
    const observer = connect(first.token);
    await waitFor(observer, 'connect');

    const joined = waitFor<{ activeUsers: number }>(observer, 'presence.updated');
    const other = connect(second.token);
    await expect(joined).resolves.toEqual({ activeUsers: 2 });

    const left = waitFor<{ activeUsers: number }>(observer, 'presence.updated');
    other.disconnect();
    await expect(left).resolves.toEqual({ activeUsers: 1 });
  });
});
