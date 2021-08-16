import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { createAuthRateLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validators/authValidators';

export function createAuthRoutes(options: { rateLimitMax?: number } = {}) {
  const router = Router();
  const authRateLimiter = createAuthRateLimiter(options.rateLimitMax);

  router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
  router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
  router.get('/me', authenticate, authController.me);

  return router;
}
