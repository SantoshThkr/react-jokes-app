import { Router } from 'express';
import { createAuthRoutes } from './authRoutes';
import { healthRoutes } from './healthRoutes';

export interface ApiRouteOptions {
  authRateLimitMax?: number;
}

export function createApiRoutes(options: ApiRouteOptions = {}) {
  const router = Router();

  router.use('/health', healthRoutes);
  router.use('/auth', createAuthRoutes({ rateLimitMax: options.authRateLimitMax }));

  return router;
}
