import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { remindersController } from './reminders.controller';

// Mounted at /reminders. The actual sending is automatic (see
// src/lib/scheduler.ts) — this is a manual trigger for the admin ("send now")
// and for previewing candidates with ?dryRun=true.
export const remindersRouter = Router();
remindersRouter.use(authenticate, authorize('ADMIN'));
remindersRouter.post('/run', remindersController.run);
