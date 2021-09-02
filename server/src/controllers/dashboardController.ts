import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboardService';

export async function summary(_req: Request, res: Response) {
  res.json({ data: await dashboardService.getSummary() });
}
