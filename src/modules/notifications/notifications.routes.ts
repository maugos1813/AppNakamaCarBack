import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { notificationsController } from './notifications.controller';

// Mounted at /entries/:entryId/notifications (needs mergeParams to read entryId).
export const entryNotificationsRouter = Router({ mergeParams: true });
entryNotificationsRouter.use(authenticate);
entryNotificationsRouter.get('/', notificationsController.listByEntry);
