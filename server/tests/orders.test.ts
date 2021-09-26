import request from 'supertest';
import { prisma } from '../src/db/prisma';
import { app, createUser, resetDatabase } from './helpers';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

async function seedOrders(count: number) {
  const base = Date.now();
  for (let i = 0; i < count; i += 1) {
    await prisma.order.create({
      data: {
        customerName: i % 2 === 0 ? `Acme ${i}` : `Globex ${i}`,
        amount: 10 + i,
        status: i % 3 === 0 ? 'PROCESSING' : 'PENDING',
        createdAt: new Date(base - i * 60_000),
      },
    });
  }
}

describe('GET /api/orders', () => {
  it('paginates on the server, newest first', async () => {
    const { auth } = await createUser('VIEWER');
    await seedOrders(25);

    const res = await request(app).get('/api/orders?page=2&pageSize=10').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(10);
    expect(res.body.data.pagination).toEqual({ page: 2, pageSize: 10, total: 25, totalPages: 3 });
    expect(res.body.data.items[0].customerName).toBe('Acme 10');
    expect(typeof res.body.data.items[0].amount).toBe('number');
  });

  it('filters by status and searches by customer name or order number', async () => {
    const { auth } = await createUser('VIEWER');
    await seedOrders(9);

    const byStatus = await request(app).get('/api/orders?status=PROCESSING').set('Authorization', auth);
    expect(byStatus.body.data.pagination.total).toBe(3);
    expect(byStatus.body.data.items.every((o: { status: string }) => o.status === 'PROCESSING')).toBe(true);

    const byName = await request(app).get('/api/orders?search=globex').set('Authorization', auth);
    expect(byName.body.data.pagination.total).toBe(4);

    const [first] = byName.body.data.items;
    const byNumber = await request(app)
      .get(`/api/orders?search=%23${first.id}`)
      .set('Authorization', auth);
    expect(byNumber.body.data.items.map((o: { id: number }) => o.id)).toEqual([first.id]);
  });

  it.each(['page=0', 'pageSize=101', 'status=SHIPPED', 'page=abc'])('rejects invalid query %s', async (qs) => {
    const { auth } = await createUser('VIEWER');
    const res = await request(app).get(`/api/orders?${qs}`).set('Authorization', auth);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/orders/:id', () => {
  it('returns a single order, 404 for a missing one and 400 for a bad id', async () => {
    const { auth } = await createUser('VIEWER');
    const order = await prisma.order.create({ data: { customerName: 'Initech', amount: 42.5 } });

    const found = await request(app).get(`/api/orders/${order.id}`).set('Authorization', auth);
    expect(found.status).toBe(200);
    expect(found.body.data).toMatchObject({
      id: order.id,
      amount: 42.5,
      status: 'PENDING',
      nextStatuses: ['PROCESSING', 'CANCELLED'],
    });

    const missing = await request(app).get('/api/orders/999999').set('Authorization', auth);
    expect(missing.status).toBe(404);

    const bad = await request(app).get('/api/orders/abc').set('Authorization', auth);
    expect(bad.status).toBe(400);
  });
});

describe('POST /api/orders', () => {
  it('creates the order and an ORDER_CREATED event atomically', async () => {
    const { auth, user } = await createUser('ADMIN');

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', auth)
      .send({ customerName: '  Hooli ', amount: '19.99' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ customerName: 'Hooli', amount: 19.99, status: 'PENDING' });
    const events = await prisma.event.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'ORDER_CREATED', userId: user.id });
  });

  it.each([
    [{ customerName: '', amount: 10 }, 'customerName'],
    [{ customerName: 'X', amount: -5 }, 'amount'],
    [{ customerName: 'X', amount: 1.234 }, 'amount'],
    [{ customerName: 'X', amount: 10, status: 'COMPLETED' }, 'status'],
  ])('rejects %j', async (body, field) => {
    const { auth } = await createUser('ADMIN');
    const res = await request(app).post('/api/orders').set('Authorization', auth).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe(field);
    expect(await prisma.order.count()).toBe(0);
  });
});

describe('PATCH /api/orders/:id', () => {
  it('moves an order through its lifecycle and records completion events', async () => {
    const { auth } = await createUser('ADMIN');
    const order = await prisma.order.create({ data: { customerName: 'Wonka', amount: 80 } });

    const processing = await request(app)
      .patch(`/api/orders/${order.id}`)
      .set('Authorization', auth)
      .send({ status: 'PROCESSING' });
    expect(processing.status).toBe(200);

    const completed = await request(app)
      .patch(`/api/orders/${order.id}`)
      .set('Authorization', auth)
      .send({ status: 'COMPLETED' });
    expect(completed.status).toBe(200);
    expect(completed.body.data.completedAt).not.toBeNull();
    expect(completed.body.data.nextStatuses).toEqual([]);

    const types = (await prisma.event.findMany()).map((e) => e.type).sort();
    expect(types).toEqual(['ORDER_COMPLETED', 'PAYMENT_COMPLETED']);
  });

  it('rejects an invalid transition with 409 and leaves the order unchanged', async () => {
    const { auth } = await createUser('ADMIN');
    const order = await prisma.order.create({ data: { customerName: 'Wonka', amount: 80 } });

    const res = await request(app)
      .patch(`/api/orders/${order.id}`)
      .set('Authorization', auth)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(409);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PENDING');
  });
});
