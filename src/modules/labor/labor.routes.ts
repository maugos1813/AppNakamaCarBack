import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { laborController } from './labor.controller';

// Mounted at /entries/:entryId/labor (needs mergeParams to read entryId).
export const entryLaborRouter = Router({ mergeParams: true });
entryLaborRouter.use(authenticate);
entryLaborRouter.get('/', laborController.list);
entryLaborRouter.post('/', laborController.create);

// Mounted flat at /labor.
export const laborRouter = Router();
laborRouter.use(authenticate);
laborRouter.patch('/:id', laborController.update);
laborRouter.delete('/:id', laborController.remove);
