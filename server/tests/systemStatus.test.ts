import request from 'supertest';
import { prisma } from '../src/db/prisma';
import { app, createUser, resetDatabase } from './helpers';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('system status', () => {
  it('lists every service in a stable order', async () => {
    const { auth } = await createUser('VIEWER');
    const res = await request(app).get('/api/system-status').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.data.map((s: { service: string }) => s.service)).toEqual([
      'API',
      'DATABASE',
      'PAYMENTS',
      'NOTIFICATIONS',
    ]);
  });

  it('updates a service (case-insensitive name) and records a warning when degraded', async () => {
    const { auth, user } = await createUser('ADMIN');

    const res = await request(app)
      .put('/api/system-status/payments')
      .set('Authorization', auth)
      .send({ status: 'DEGRADED' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      service: 'PAYMENTS',
      status: 'DEGRADED',
      updatedBy: { id: user.id },
    });
    const events = await prisma.event.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'SYSTEM_WARNING', message: 'Payments is degraded' });
  });

  it('does not record an event when the status is unchanged or recovers', async () => {
    const { auth } = await createUser('ADMIN');

    await request(app).put('/api/system-status/API').set('Authorization', auth).send({ status: 'ONLINE' });
    expect(await prisma.event.count()).toBe(0);
  });

  it('rejects unknown services and states', async () => {
    const { auth } = await createUser('ADMIN');

    const badService = await request(app)
      .put('/api/system-status/CACHE')
      .set('Authorization', auth)
      .send({ status: 'ONLINE' });
    const badState = await request(app)
      .put('/api/system-status/API')
      .set('Authorization', auth)
      .send({ status: 'ON_FIRE' });

    expect(badService.status).toBe(400);
    expect(badState.status).toBe(400);
  });
});
