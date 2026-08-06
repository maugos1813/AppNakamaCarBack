import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { entriesController } from './entries.controller';

export const entriesRouter = Router();

entriesRouter.use(authenticate);

entriesRouter.get('/', entriesController.list);
entriesRouter.post('/', entriesController.create);
entriesRouter.get('/:id', entriesController.getById);
entriesRouter.patch('/:id', entriesController.update);
entriesRouter.get('/:id/history', entriesController.getHistory);
entriesRouter.get('/:id/estimate', entriesController.getEstimate);
entriesRouter.patch('/:id/status', entriesController.changeStatus);
