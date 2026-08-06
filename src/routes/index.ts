import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';
import { clientsRouter } from '../modules/clients/clients.routes';
import { vehiclesRouter } from '../modules/vehicles/vehicles.routes';
import { entriesRouter } from '../modules/entries/entries.routes';
import { entryPhotosRouter, photosRouter } from '../modules/photos/photos.routes';
import { entryDamagesRouter, damagesRouter } from '../modules/damages/damages.routes';
import { entryLaborRouter, laborRouter } from '../modules/labor/labor.routes';
import { entryPartsRouter, partsRouter } from '../modules/parts/parts.routes';
import { entryCostsRouter, costsRouter } from '../modules/costs/costs.routes';
import { entryStagesRouter, stagesRouter } from '../modules/repairs/repairs.routes';

// Central mount point for every feature module's router.
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/clients', clientsRouter);
apiRouter.use('/vehicles', vehiclesRouter);
// More specific paths registered before the generic "/entries" mount so they
// match first instead of falling through entriesRouter's own routing.
apiRouter.use('/entries/:entryId/photos', entryPhotosRouter);
apiRouter.use('/entries/:entryId/damages', entryDamagesRouter);
apiRouter.use('/entries/:entryId/labor', entryLaborRouter);
apiRouter.use('/entries/:entryId/parts', entryPartsRouter);
apiRouter.use('/entries/:entryId/costs', entryCostsRouter);
apiRouter.use('/entries/:entryId/stages', entryStagesRouter);
apiRouter.use('/entries', entriesRouter);
apiRouter.use('/photos', photosRouter);
apiRouter.use('/damages', damagesRouter);
apiRouter.use('/labor', laborRouter);
apiRouter.use('/parts', partsRouter);
apiRouter.use('/costs', costsRouter);
apiRouter.use('/stages', stagesRouter);
