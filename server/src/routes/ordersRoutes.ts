import { Router } from 'express';
import * as ordersController from '../controllers/ordersController';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateBody } from '../middleware/validate';
import { createOrderSchema, updateOrderSchema } from '../validators/orderValidators';

export const ordersRoutes = Router();

ordersRoutes.use(authenticate);
ordersRoutes.get('/', ordersController.list);
ordersRoutes.get('/:id', ordersController.getById);
ordersRoutes.post('/', requireRole('ADMIN'), validateBody(createOrderSchema), ordersController.create);
ordersRoutes.patch(
  '/:id',
  requireRole('ADMIN'),
  validateBody(updateOrderSchema),
  ordersController.updateStatus,
);
