import { Router } from 'express';
import * as systemStatusController from '../controllers/systemStatusController';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateBody } from '../middleware/validate';
import { updateSystemStatusSchema } from '../validators/systemStatusValidators';

export const systemStatusRoutes = Router();

systemStatusRoutes.use(authenticate);
systemStatusRoutes.get('/', systemStatusController.list);
systemStatusRoutes.put(
  '/:service',
  requireRole('ADMIN'),
  validateBody(updateSystemStatusSchema),
  systemStatusController.update,
);
