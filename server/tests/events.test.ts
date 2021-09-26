import request from 'supertest';
import { prisma } from '../src/db/prisma';
import { app, createUser, resetDatabase } from './helpers';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('GET /api/events', () => {
  it('paginates and filters by type', async () => {
    const { auth } = await createUser('VIEWER');
    const base = Date.now();
    await prisma.event.createMany({
      data: Array.from({ length: 12 }, (_, i) => ({
        type: i % 4 === 0 ? ('SYSTEM_WARNING' as const) : ('ORDER_CREATED' as const),
        message: `Event ${i}`,
        createdAt: new Date(base - i * 1000),
      })),
    });

    const page = await request(app).get('/api/events?pageSize=5').set('Authorization', auth);
    expect(page.status).toBe(200);
    expect(page.body.data.items.map((e: { message: string }) => e.message)).toEqual([
      'Event 0',
      'Event 1',
      'Event 2',
      'Event 3',
      'Event 4',
    ]);
    expect(page.body.data.pagination.totalPages).toBe(3);

    const warnings = await request(app).get('/api/events?type=SYSTEM_WARNING').set('Authorization', auth);
    expect(warnings.body.data.pagination.total).toBe(3);

    const invalid = await request(app).get('/api/events?type=NOPE').set('Authorization', auth);
    expect(invalid.status).toBe(400);
  });
});

describe('POST /api/events', () => {
  it('lets an admin create a test event attributed to them', async () => {
    const { auth, user } = await createUser('ADMIN', { name: 'Ada' });

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', auth)
      .send({ type: 'SYSTEM_WARNING', message: 'Disk 90% full', metadata: { host: 'db-1' } });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      type: 'SYSTEM_WARNING',
      message: 'Disk 90% full',
      metadata: { host: 'db-1' },
      user: { id: user.id, name: 'Ada' },
    });
  });

  it('validates type, message and metadata', async () => {
    const { auth } = await createUser('ADMIN');

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', auth)
      .send({ type: 'DELETE_EVERYTHING', message: '   ', metadata: { nested: { a: 1 } } });

    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['type', 'message', 'metadata.nested']));
  });
});
