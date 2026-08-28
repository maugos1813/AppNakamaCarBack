import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { workRequestsController } from './workRequests.controller';

// Mounted at /entries/:entryId/work-requests (needs mergeParams for entryId).
export const entryWorkRequestsRouter = Router({ mergeParams: true });
entryWorkRequestsRouter.use(authenticate);
entryWorkRequestsRouter.get('/', workRequestsController.listByEntry);
entryWorkRequestsRouter.post('/', workRequestsController.create);

// Mounted flat at /work-requests — the cross-entry queue ("Richiesta").
export const workRequestsRouter = Router();
workRequestsRouter.use(authenticate);
workRequestsRouter.get('/', workRequestsController.listAll);
workRequestsRouter.patch('/:id', workRequestsController.update);
workRequestsRouter.patch('/:id/status', authorize('ADMIN'), workRequestsController.setStatus);
workRequestsRouter.delete('/:id', workRequestsController.remove);
