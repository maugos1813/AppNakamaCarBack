import { Router } from 'express';
import { authenticateClientSession } from '../../middlewares/authenticateClientSession';
import { loginRateLimiter } from '../../middlewares/rateLimit';
import { clientAuthController } from './clientAuth.controller';

export const clientAuthRouter = Router();

clientAuthRouter.post('/login', loginRateLimiter, clientAuthController.login);
clientAuthRouter.post('/set-password', loginRateLimiter, clientAuthController.setPassword);
clientAuthRouter.post('/forgot-password', loginRateLimiter, clientAuthController.forgotPassword);
clientAuthRouter.get('/me', authenticateClientSession, clientAuthController.me);
