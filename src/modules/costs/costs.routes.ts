import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { costsController } from './costs.controller';

// Mounted at /entries/:entryId/costs (needs mergeParams to read entryId).
export const entryCostsRouter = Router({ mergeParams: true });
entryCostsRouter.use(authenticate);
entryCostsRouter.get('/', costsController.list);
entryCostsRouter.post('/', costsController.create);

// Mounted flat at /costs.
export const costsRouter = Router();
costsRouter.use(authenticate);
costsRouter.patch('/:id', costsController.update);
costsRouter.delete('/:id', costsController.remove);
