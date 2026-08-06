import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';
import { clientsRouter } from '../modules/clients/clients.routes';
import { vehiclesRouter } from '../modules/vehicles/vehicles.routes';
import { entriesRouter } from '../modules/entries/entries.routes';

// Central mount point for every feature module's router.
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/clients', clientsRouter);
apiRouter.use('/vehicles', vehiclesRouter);
apiRouter.use('/entries', entriesRouter);
