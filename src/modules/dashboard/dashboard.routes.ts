import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { dashboardController } from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/summary', dashboardController.summary);
dashboardRouter.get('/activity', dashboardController.activity);
