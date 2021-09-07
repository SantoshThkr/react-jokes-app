import type { Order, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import type { OrderDto } from '../types/order';
import { conflict, notFound } from '../utils/httpError';
import type { Page } from '../utils/pagination';
import { buildPage, toSkipTake } from '../utils/pagination';
import type { CreateOrderInput, ListOrdersQuery } from '../validators/orderValidators';
import type { RecordEventInput } from './eventService';
import { recordEvent } from './eventService';

/** Allowed lifecycle moves. COMPLETED and CANCELLED are final. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function toOrderDto(order: Order): OrderDto {
  return {
    id: order.id,
    customerName: order.customerName,
    amount: order.amount.toNumber(),
    status: order.status,
    completedAt: order.completedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function listOrders(query: ListOrdersQuery): Promise<Page<OrderDto>> {
  const where: Prisma.OrderWhereInput = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.search) {
    const orderNumber = Number(query.search.replace(/^#/, ''));
    where.OR = [
      { customerName: { contains: query.search, mode: 'insensitive' } },
      ...(Number.isInteger(orderNumber) && orderNumber > 0 && orderNumber <= 2_147_483_647
        ? [{ id: orderNumber }]
        : []),
    ];
  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...toSkipTake(query),
    }),
    prisma.order.count({ where }),
  ]);

  return buildPage(orders.map(toOrderDto), total, query);
}

export async function getOrder(id: number): Promise<OrderDto> {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    throw notFound(`Order #${id} not found`);
  }
  return toOrderDto(order);
}

export async function createOrder(input: CreateOrderInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: input });
    const event = await recordEvent(
      {
        type: 'ORDER_CREATED',
        message: `Order #${order.id} created for ${order.customerName}`,
        userId: actorId,
        metadata: { orderId: order.id },
      },
      tx,
    );
    return { order: toOrderDto(order), events: [event] };
  });
}

function eventsForStatusChange(order: Order, actorId: string): RecordEventInput[] {
  const metadata = { orderId: order.id, status: order.status };
  if (order.status === 'COMPLETED') {
    return [
      {
        type: 'PAYMENT_COMPLETED',
        message: `Payment of $${order.amount.toFixed(2)} completed for order #${order.id}`,
        userId: actorId,
        metadata,
      },
      { type: 'ORDER_COMPLETED', message: `Order #${order.id} completed`, userId: actorId, metadata },
    ];
  }
  // PROCESSING and CANCELLED are visible on the order itself; the activity
  // feed keeps to the event types the business tracks.
  return [];
}

export async function updateOrderStatus(id: number, status: OrderStatus, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id } });
    if (!current) {
      throw notFound(`Order #${id} not found`);
    }
    if (current.status === status) {
      return { order: toOrderDto(current), events: [], changed: false };
    }
    if (!ALLOWED_TRANSITIONS[current.status].includes(status)) {
      throw conflict(`Cannot change order #${id} from ${current.status} to ${status}`);
    }

    // Conditional update: if another request changed the status since we read
    // it, nothing matches and we report a conflict instead of overwriting.
    const { count } = await tx.order.updateMany({
      where: { id, status: current.status },
      data: { status, completedAt: status === 'COMPLETED' ? new Date() : null },
    });
    if (count === 0) {
      throw conflict(`Order #${id} was modified by someone else. Reload and try again.`);
    }

    const order = await tx.order.findUniqueOrThrow({ where: { id } });
    const events = [];
    for (const eventInput of eventsForStatusChange(order, actorId)) {
      events.push(await recordEvent(eventInput, tx));
    }
    return { order: toOrderDto(order), events, changed: true };
  });
}
