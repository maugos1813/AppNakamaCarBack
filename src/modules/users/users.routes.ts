import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { usersController } from './users.controller';

export const usersRouter = Router();

usersRouter.use(authenticate);

// Static/self routes first — must be registered before "/:id" so they don't get swallowed by it.
usersRouter.get('/roles', usersController.listRoles);
usersRouter.patch('/me', usersController.updateMe);
usersRouter.patch('/me/password', usersController.changeOwnPassword);

usersRouter.get('/', authorize('ADMIN'), usersController.list);
usersRouter.post('/', authorize('ADMIN'), usersController.create);
usersRouter.get('/:id', authorize('ADMIN'), usersController.getById);
usersRouter.patch('/:id', authorize('ADMIN'), usersController.update);
