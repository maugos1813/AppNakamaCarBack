import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';
import { clientsRouter } from '../modules/clients/clients.routes';
import { vehiclesRouter } from '../modules/vehicles/vehicles.routes';
import { entriesRouter } from '../modules/entries/entries.routes';
import { entryPhotosRouter, photosRouter } from '../modules/photos/photos.routes';

// Central mount point for every feature module's router.
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/clients', clientsRouter);
apiRouter.use('/vehicles', vehiclesRouter);
// More specific path registered before the generic "/entries" mount so it
// matches first instead of falling through entriesRouter's own routing.
apiRouter.use('/entries/:entryId/photos', entryPhotosRouter);
apiRouter.use('/entries', entriesRouter);
apiRouter.use('/photos', photosRouter);
