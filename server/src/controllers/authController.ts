import type { Request, Response } from 'express';
import { getAuthUser } from '../middleware/authenticate';
import * as authService from '../services/authService';
import type { LoginInput, RegisterInput } from '../validators/authValidators';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body as RegisterInput);
  res.status(201).json({ data: result });
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body as LoginInput);
  res.json({ data: result });
}

export function me(req: Request, res: Response) {
  res.json({ data: { user: getAuthUser(req) } });
}
