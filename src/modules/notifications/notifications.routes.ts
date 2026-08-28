import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { notificationsController } from './notifications.controller';

// Mounted at /entries/:entryId/notifications (needs mergeParams to read entryId).
export const entryNotificationsRouter = Router({ mergeParams: true });
entryNotificationsRouter.use(authenticate);
entryNotificationsRouter.get('/', notificationsController.listByEntry);

// Mounted flat at /notifications — the logged-in staff member's own in-app
// notification feed (e.g. "new Richiesta"), unrelated to the client-facing
// send log above.
export const staffNotificationsRouter = Router();
staffNotificationsRouter.use(authenticate);
staffNotificationsRouter.get('/', notificationsController.listMine);
staffNotificationsRouter.patch('/:id/read', notificationsController.markRead);
