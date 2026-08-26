import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { clientAuthService } from './clientAuth.service';
import { clientForgotPasswordSchema, clientLoginSchema, clientSetPasswordSchema } from './clientAuth.validation';

export const clientAuthController = {
  async login(req: Request, res: Response) {
    const input = clientLoginSchema.parse(req.body);
    const result = await clientAuthService.login(input);
    sendSuccess(res, { message: 'Login successful.', data: result });
  },

  async setPassword(req: Request, res: Response) {
    const input = clientSetPasswordSchema.parse(req.body);
    await clientAuthService.setPassword(input);
    sendSuccess(res, { message: 'Password set successfully.' });
  },

  async forgotPassword(req: Request, res: Response) {
    const input = clientForgotPasswordSchema.parse(req.body);
    await clientAuthService.forgotPassword(input);
    sendSuccess(res, { message: 'If that email has a premium account, a reset link has been sent.' });
  },

  async me(req: Request, res: Response) {
    const client = await clientAuthService.getMe(req.clientSession!.id);
    sendSuccess(res, { message: 'Current client retrieved successfully.', data: client });
  },
};
