import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { reportsController } from './reports.controller';

export const reportsRouter = Router();
reportsRouter.use(authenticate, authorize('ADMIN'));
reportsRouter.get('/mechanic-productivity', reportsController.mechanicProductivity);
