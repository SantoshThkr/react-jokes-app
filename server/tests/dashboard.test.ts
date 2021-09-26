import request from 'supertest';
import { prisma } from '../src/db/prisma';
import { app, createUser, resetDatabase } from './helpers';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const now = new Date();
const yesterday = new Date(now.getTime() - 36 * 60 * 60 * 1000);

describe('GET /api/dashboard/summary', () => {
  it('computes today’s figures from the database', async () => {
    const { auth } = await createUser('VIEWER');
    await prisma.order.createMany({
      data: [
        { customerName: 'Today pending', amount: 10, status: 'PENDING' },
        { customerName: 'Today done', amount: 100.25, status: 'COMPLETED', completedAt: now },
        { customerName: 'Today done 2', amount: 50, status: 'COMPLETED', completedAt: now },
        // Created and completed yesterday: excluded from both figures.
        { customerName: 'Old', amount: 999, status: 'COMPLETED', createdAt: yesterday, completedAt: yesterday },
      ],
    });
    await prisma.event.createMany({
      data: [
        { type: 'SYSTEM_WARNING', message: 'Disk almost full' },
        { type: 'SYSTEM_WARNING', message: 'Old warning', createdAt: yesterday },
        { type: 'ORDER_CREATED', message: 'Not an error' },
      ],
    });

    const res = await request(app).get('/api/dashboard/summary').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      activeUsers: 0,
      ordersToday: 3,
      revenueToday: 150.25,
      errorsToday: 1,
    });
    expect(new Date(res.body.data.periodStart).getUTCHours()).toBe(0);
  });

  it('returns zeros for an empty database', async () => {
    const { auth } = await createUser('VIEWER');
    const res = await request(app).get('/api/dashboard/summary').set('Authorization', auth);

    expect(res.body.data).toMatchObject({ ordersToday: 0, revenueToday: 0, errorsToday: 0 });
  });
});
