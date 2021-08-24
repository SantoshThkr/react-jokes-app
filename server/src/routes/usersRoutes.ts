import { Router } from 'express';
import * as usersController from '../controllers/usersController';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';

export const usersRoutes = Router();

usersRoutes.use(authenticate, requireRole('ADMIN'));
usersRoutes.get('/', usersController.list);
