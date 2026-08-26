import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { clientsController } from './clients.controller';

export const clientsRouter = Router();

clientsRouter.use(authenticate);

clientsRouter.get('/', clientsController.list);
clientsRouter.post('/', clientsController.create);
clientsRouter.get('/:id', clientsController.getById);
clientsRouter.patch('/:id', clientsController.update);
clientsRouter.delete('/:id', authorize('ADMIN'), clientsController.remove);
clientsRouter.post('/:id/enable-portal', authorize('ADMIN'), clientsController.enablePortal);
clientsRouter.post('/:id/disable-portal', authorize('ADMIN'), clientsController.disablePortal);
