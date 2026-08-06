import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { usersService } from './users.service';
import {
  changePasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateMeSchema,
  updateUserSchema,
} from './users.validation';

export const usersController = {
  async list(req: Request, res: Response) {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await usersService.listUsers(query);
    sendSuccess(res, { message: 'Users retrieved successfully.', data: result });
  },

  async getById(req: Request, res: Response) {
    const user = await usersService.getUserById(req.params.id as string);
    sendSuccess(res, { message: 'User retrieved successfully.', data: user });
  },

  async create(req: Request, res: Response) {
    const input = createUserSchema.parse(req.body);
    const user = await usersService.createUser(input);
    sendSuccess(res, { statusCode: 201, message: 'User created successfully.', data: user });
  },

  async update(req: Request, res: Response) {
    const input = updateUserSchema.parse(req.body);
    const user = await usersService.updateUser(req.params.id as string, input);
    sendSuccess(res, { message: 'User updated successfully.', data: user });
  },

  async updateMe(req: Request, res: Response) {
    const input = updateMeSchema.parse(req.body);
    const user = await usersService.updateMe(req.user!.id, input);
    sendSuccess(res, { message: 'Profile updated successfully.', data: user });
  },

  async changeOwnPassword(req: Request, res: Response) {
    const input = changePasswordSchema.parse(req.body);
    await usersService.changeOwnPassword(req.user!.id, input);
    sendSuccess(res, { message: 'Password changed successfully.' });
  },

  async listRoles(_req: Request, res: Response) {
    const roles = await usersService.listRoles();
    sendSuccess(res, { message: 'Roles retrieved successfully.', data: roles });
  },
};
