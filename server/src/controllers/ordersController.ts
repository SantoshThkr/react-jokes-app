import type { Request, Response } from 'express';
import { getAuthUser } from '../middleware/authenticate';
import * as orderService from '../services/orderService';
import { parseInput } from '../utils/validation';
import type { CreateOrderInput, UpdateOrderInput } from '../validators/orderValidators';
import { listOrdersQuerySchema, orderIdParamsSchema } from '../validators/orderValidators';

export async function list(req: Request, res: Response) {
  const query = parseInput(listOrdersQuerySchema, req.query);
  res.json({ data: await orderService.listOrders(query) });
}

export async function getById(req: Request, res: Response) {
  const { id } = parseInput(orderIdParamsSchema, req.params);
  res.json({ data: await orderService.getOrder(id) });
}

export async function create(req: Request, res: Response) {
  const input = req.body as CreateOrderInput;
  const { order } = await orderService.createOrder(input, getAuthUser(req).id);
  res.status(201).json({ data: order });
}

export async function updateStatus(req: Request, res: Response) {
  const { id } = parseInput(orderIdParamsSchema, req.params);
  const { status } = req.body as UpdateOrderInput;
  const { order } = await orderService.updateOrderStatus(id, status, getAuthUser(req).id);
  res.json({ data: order });
}
