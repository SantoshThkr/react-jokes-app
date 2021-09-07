import type { Request, Response } from 'express';
import { getAuthUser } from '../middleware/authenticate';
import * as systemStatusService from '../services/systemStatusService';
import { parseInput } from '../utils/validation';
import type { UpdateSystemStatusInput } from '../validators/systemStatusValidators';
import { serviceParamsSchema } from '../validators/systemStatusValidators';

export async function list(_req: Request, res: Response) {
  res.json({ data: await systemStatusService.listSystemStatus() });
}

export async function update(req: Request, res: Response) {
  const { service } = parseInput(serviceParamsSchema, req.params);
  const { status } = req.body as UpdateSystemStatusInput;
  const result = await systemStatusService.updateSystemStatus(service, status, getAuthUser(req).id);
  res.json({ data: result.status });
}
