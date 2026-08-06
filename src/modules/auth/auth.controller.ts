import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { authService } from './auth.service';
import { loginSchema } from './auth.validation';

export const authController = {
  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    sendSuccess(res, { message: 'Login successful.', data: result });
  },

  async me(req: Request, res: Response) {
    const user = await authService.getMe(req.user!.id);
    sendSuccess(res, { message: 'Current user retrieved successfully.', data: user });
  },
};
