import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { financeController } from './finance.controller';

export const financeRouter = Router();

financeRouter.use(authenticate, authorize('ADMIN'));
financeRouter.get('/summary', financeController.summary);
financeRouter.get('/overdue', financeController.overdue);
