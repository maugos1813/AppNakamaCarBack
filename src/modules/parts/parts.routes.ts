import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { partsController } from './parts.controller';

// Mounted at /entries/:entryId/parts (needs mergeParams to read entryId).
export const entryPartsRouter = Router({ mergeParams: true });
entryPartsRouter.use(authenticate);
entryPartsRouter.get('/', partsController.list);
entryPartsRouter.post('/', partsController.create);

// Mounted flat at /parts.
export const partsRouter = Router();
partsRouter.use(authenticate);
partsRouter.patch('/:id', partsController.update);
partsRouter.delete('/:id', partsController.remove);
