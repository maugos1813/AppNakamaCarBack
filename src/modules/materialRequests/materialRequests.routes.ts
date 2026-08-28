import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { materialRequestsController } from './materialRequests.controller';

// Mounted flat at /material-requests. Anyone can ask for material; only an
// admin approves or rejects — stock itself only moves on InventoryItem once
// the material actually arrives, by hand.
export const materialRequestsRouter = Router();
materialRequestsRouter.use(authenticate);
materialRequestsRouter.get('/', materialRequestsController.listAll);
materialRequestsRouter.post('/', materialRequestsController.create);
materialRequestsRouter.patch('/:id/status', authorize('ADMIN'), materialRequestsController.setStatus);
materialRequestsRouter.delete('/:id', materialRequestsController.remove);
