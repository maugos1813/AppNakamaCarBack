import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { deviceTokensService } from './deviceTokens.service';
import { registerDeviceTokenSchema } from './deviceTokens.validation';

export const deviceTokensController = {
  async register(req: Request, res: Response) {
    const input = registerDeviceTokenSchema.parse(req.body);
    const record = await deviceTokensService.registerToken(req.user!.id, input);
    sendSuccess(res, { statusCode: 201, message: 'Device token registered successfully.', data: record });
  },
};
