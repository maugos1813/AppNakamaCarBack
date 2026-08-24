import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { loginRateLimiter } from '../../middlewares/rateLimit';
import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, authController.login);
authRouter.post('/forgot-password', loginRateLimiter, authController.forgotPassword);
authRouter.post('/reset-password', loginRateLimiter, authController.resetPassword);
authRouter.get('/me', authenticate, authController.me);
