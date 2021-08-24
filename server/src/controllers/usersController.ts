import type { Request, Response } from 'express';
import * as userService from '../services/userService';
import { parseInput } from '../utils/validation';
import { paginationSchema } from '../validators/commonValidators';

export async function list(req: Request, res: Response) {
  const pagination = parseInput(paginationSchema, req.query);
  res.json({ data: await userService.listUsers(pagination) });
}
