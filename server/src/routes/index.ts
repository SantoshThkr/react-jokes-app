import { Router } from 'express';
import { healthRoutes } from './healthRoutes';

export const apiRoutes = Router();

apiRoutes.use('/health', healthRoutes);
