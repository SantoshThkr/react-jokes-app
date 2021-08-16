/**
 * Development seed data. Never runs against production.
 *
 *   npm run db:seed
 */
import type { OrderStatus } from '@prisma/client';
import { EventType, Prisma, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed a production database.');
}

const prisma = new PrismaClient();

// Development-only credentials, documented in the README. Override with SEED_USER_PASSWORD.
const seedPassword = process.env.SEED_USER_PASSWORD ?? 'Password123!';

const devUsers = [
  { name: 'Ada Admin', email: 'admin@example.com', role: Role.ADMIN },
  { name: 'Victor Viewer', email: 'viewer@example.com', role: Role.VIEWER },
];

const customers = [
  'Acme Corp',
  'Globex',
  'Initech',
  'Umbrella Ltd',
  'Stark Industries',
  'Wayne Enterprises',
  'Hooli',
  'Soylent Co',
  'Wonka Foods',
  'Cyberdyne',
];

const statuses: OrderStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED', 'CANCELLED'];

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

async function seedUsers() {
  const passwordHash = await bcrypt.hash(seedPassword, 10);
  for (const user of devUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: { ...user, passwordHash },
    });
  }
}

async function seedOrdersAndEvents() {
  // Seed data is disposable: start from a clean slate every time.
  await prisma.event.deleteMany();
  await prisma.order.deleteMany();

  for (let i = 0; i < 60; i += 1) {
    // Spread orders over the last ~3 days, most recent first in the loop.
    const createdAt = minutesAgo(i * 70 + 5);
    const status = statuses[i % statuses.length];
    const amount = new Prisma.Decimal(((i * 37) % 450) + 25.5);
    const completedAt = status === 'COMPLETED' ? new Date(createdAt.getTime() + 15 * 60_000) : null;

    const order = await prisma.order.create({
      data: {
        customerName: customers[i % customers.length],
        amount,
        status,
        createdAt,
        completedAt,
      },
    });

    const events: Prisma.EventCreateManyInput[] = [
      {
        type: EventType.ORDER_CREATED,
        message: `Order #${order.id} created for ${order.customerName}`,
        metadata: { orderId: order.id },
        createdAt,
      },
    ];
    if (completedAt) {
      events.push(
        {
          type: EventType.PAYMENT_COMPLETED,
          message: `Payment of $${amount.toFixed(2)} completed for order #${order.id}`,
          metadata: { orderId: order.id },
          createdAt: completedAt,
        },
        {
          type: EventType.ORDER_COMPLETED,
          message: `Order #${order.id} completed`,
          metadata: { orderId: order.id },
          createdAt: completedAt,
        },
      );
    }
    await prisma.event.createMany({ data: events });
  }

  await prisma.event.createMany({
    data: [
      {
        type: EventType.SYSTEM_WARNING,
        message: 'Payments latency above 2s threshold',
        metadata: { service: 'PAYMENTS' },
        createdAt: minutesAgo(45),
      },
      {
        type: EventType.SYSTEM_WARNING,
        message: 'Notification queue backlog growing',
        metadata: { service: 'NOTIFICATIONS' },
        createdAt: minutesAgo(180),
      },
    ],
  });
}

async function main() {
  await seedUsers();
  await seedOrdersAndEvents();
  const [users, orders, events] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.event.count(),
  ]);
  process.stdout.write(`Seeded ${users} users, ${orders} orders and ${events} events.\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Seed failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
