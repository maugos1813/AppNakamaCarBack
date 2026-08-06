import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { uploadImage } from '../../middlewares/upload';
import { photosController } from './photos.controller';

// Mounted at /entries/:entryId/photos (needs mergeParams to read entryId).
export const entryPhotosRouter = Router({ mergeParams: true });
entryPhotosRouter.use(authenticate);
entryPhotosRouter.get('/', photosController.list);
entryPhotosRouter.post('/', uploadImage.single('photo'), photosController.upload);

// Mounted flat at /photos — deleting only needs the photo's own id.
export const photosRouter = Router();
photosRouter.use(authenticate);
photosRouter.delete('/:id', photosController.remove);
