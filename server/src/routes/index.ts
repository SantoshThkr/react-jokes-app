import { Router } from 'express';
import { createAuthRoutes } from './authRoutes';
import { dashboardRoutes } from './dashboardRoutes';
import { eventsRoutes } from './eventsRoutes';
import { healthRoutes } from './healthRoutes';
import { ordersRoutes } from './ordersRoutes';
import { systemStatusRoutes } from './systemStatusRoutes';
import { usersRoutes } from './usersRoutes';

export interface ApiRouteOptions {
  authRateLimitMax?: number;
}

export function createApiRoutes(options: ApiRouteOptions = {}) {
  const router = Router();

  router.use('/health', healthRoutes);
  router.use('/auth', createAuthRoutes({ rateLimitMax: options.authRateLimitMax }));
  router.use('/users', usersRoutes);
  router.use('/dashboard', dashboardRoutes);
  router.use('/orders', ordersRoutes);
  router.use('/events', eventsRoutes);
  router.use('/system-status', systemStatusRoutes);

  return router;
}
