import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { authService } from './auth.service';
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from './auth.validation';

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

  async forgotPassword(req: Request, res: Response) {
    const input = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(input);
    sendSuccess(res, { message: 'If that email is registered, a reset link has been sent.' });
  },

  async resetPassword(req: Request, res: Response) {
    const input = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(input);
    sendSuccess(res, { message: 'Password has been reset.' });
  },
};
