import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { authenticate } from '../middleware/authenticate';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate);
dashboardRoutes.get('/summary', dashboardController.summary);
