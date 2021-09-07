import type { Request, Response } from 'express';
import { getAuthUser } from '../middleware/authenticate';
import * as eventService from '../services/eventService';
import { parseInput } from '../utils/validation';
import type { CreateEventInput } from '../validators/eventValidators';
import { listEventsQuerySchema } from '../validators/eventValidators';

export async function list(req: Request, res: Response) {
  const query = parseInput(listEventsQuerySchema, req.query);
  res.json({ data: await eventService.listEvents(query) });
}

export async function create(req: Request, res: Response) {
  const event = await eventService.createEvent(req.body as CreateEventInput, getAuthUser(req).id);
  res.status(201).json({ data: event });
}
