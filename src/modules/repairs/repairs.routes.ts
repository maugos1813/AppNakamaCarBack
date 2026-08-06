import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { repairsController } from './repairs.controller';

// Mounted at /entries/:entryId/stages (needs mergeParams to read entryId).
export const entryStagesRouter = Router({ mergeParams: true });
entryStagesRouter.use(authenticate);
entryStagesRouter.get('/', repairsController.list);

// Mounted flat at /stages.
export const stagesRouter = Router();
stagesRouter.use(authenticate);
stagesRouter.patch('/:id', repairsController.update);
