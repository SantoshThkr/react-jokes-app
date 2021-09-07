import { Router } from 'express';
import * as eventsController from '../controllers/eventsController';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateBody } from '../middleware/validate';
import { createEventSchema } from '../validators/eventValidators';

export const eventsRoutes = Router();

eventsRoutes.use(authenticate);
eventsRoutes.get('/', eventsController.list);
eventsRoutes.post('/', requireRole('ADMIN'), validateBody(createEventSchema), eventsController.create);
