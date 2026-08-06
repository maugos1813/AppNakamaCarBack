import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', authController.login);
authRouter.get('/me', authenticate, authController.me);
