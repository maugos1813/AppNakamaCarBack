import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { deviceTokensController } from './deviceTokens.controller';

// Mounted at /device-tokens. Any authenticated staff member registers their
// own device — there's nothing here that needs admin-only gating.
export const deviceTokensRouter = Router();
deviceTokensRouter.use(authenticate);
deviceTokensRouter.post('/', deviceTokensController.register);
