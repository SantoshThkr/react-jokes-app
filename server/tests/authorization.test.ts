import request from 'supertest';
import { prisma } from '../src/db/prisma';
import { app, createUser, resetDatabase } from './helpers';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('role based authorization', () => {
  const adminOnly: [string, string, object | undefined][] = [
    ['post', '/api/orders', { customerName: 'Acme', amount: 10 }],
    ['patch', '/api/orders/1001', { status: 'PROCESSING' }],
    ['post', '/api/events', { type: 'SYSTEM_WARNING', message: 'test' }],
    ['put', '/api/system-status/PAYMENTS', { status: 'OFFLINE' }],
    ['get', '/api/users', undefined],
  ];

  it.each(adminOnly)('forbids VIEWER from %s %s', async (method, path, body) => {
    const { auth } = await createUser('VIEWER');
    const req = request(app)[method as 'get'](path).set('Authorization', auth);
    const res = await (body ? req.send(body) : req);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/permission/i);
  });

  it('does not change data when a VIEWER is refused', async () => {
    const { auth } = await createUser('VIEWER');
    await request(app)
      .put('/api/system-status/PAYMENTS')
      .set('Authorization', auth)
      .send({ status: 'OFFLINE' });
    await request(app).post('/api/orders').set('Authorization', auth).send({ customerName: 'X', amount: 5 });

    const payments = await prisma.systemStatus.findUniqueOrThrow({ where: { service: 'PAYMENTS' } });
    expect(payments.status).toBe('ONLINE');
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.event.count()).toBe(0);
  });

  it.each(['/api/dashboard/summary', '/api/orders', '/api/events', '/api/system-status'])(
    'allows VIEWER to read %s',
    async (path) => {
      const { auth } = await createUser('VIEWER');
      const res = await request(app).get(path).set('Authorization', auth);
      expect(res.status).toBe(200);
    },
  );

  it.each(['/api/dashboard/summary', '/api/orders', '/api/events', '/api/system-status', '/api/users'])(
    'requires authentication for %s',
    async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    },
  );

  it('lets ADMIN list users without exposing password hashes', async () => {
    const { auth } = await createUser('ADMIN');
    await createUser('VIEWER');

    const res = await request(app).get('/api/users').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBe(2);
    for (const user of res.body.data.items) {
      expect(user).not.toHaveProperty('passwordHash');
    }
  });
});
