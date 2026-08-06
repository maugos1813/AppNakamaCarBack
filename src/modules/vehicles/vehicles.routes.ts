import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { vehiclesController } from './vehicles.controller';

export const vehiclesRouter = Router();

vehiclesRouter.use(authenticate);

vehiclesRouter.get('/', vehiclesController.list);
vehiclesRouter.post('/', vehiclesController.create);
vehiclesRouter.get('/:id', vehiclesController.getById);
vehiclesRouter.patch('/:id', vehiclesController.update);
vehiclesRouter.delete('/:id', authorize('ADMIN'), vehiclesController.remove);
