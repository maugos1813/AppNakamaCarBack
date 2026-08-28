import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { inventoryController } from './inventory.controller';

// Mounted at /inventory-items. Everyone can see what's in stock; only an
// admin manages it — creating items and adjusting quantity by hand.
export const inventoryRouter = Router();
inventoryRouter.use(authenticate);
inventoryRouter.get('/', inventoryController.list);
inventoryRouter.post('/', authorize('ADMIN'), inventoryController.create);
inventoryRouter.patch('/:id', authorize('ADMIN'), inventoryController.update);
inventoryRouter.delete('/:id', authorize('ADMIN'), inventoryController.remove);
