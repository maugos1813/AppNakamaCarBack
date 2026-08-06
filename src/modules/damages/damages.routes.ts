import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { damagesController } from './damages.controller';

// Mounted at /entries/:entryId/damages (needs mergeParams to read entryId).
export const entryDamagesRouter = Router({ mergeParams: true });
entryDamagesRouter.use(authenticate);
entryDamagesRouter.get('/', damagesController.list);
entryDamagesRouter.post('/', damagesController.create);

// Mounted flat at /damages.
export const damagesRouter = Router();
damagesRouter.use(authenticate);
damagesRouter.patch('/:id', damagesController.update);
damagesRouter.delete('/:id', damagesController.remove);
