import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { notificationsService } from './notifications.service';

export const notificationsController = {
  async listByEntry(req: Request, res: Response) {
    const notifications = await notificationsService.listByEntry(req.params.entryId as string);
    sendSuccess(res, { message: 'Notifications retrieved successfully.', data: notifications });
  },
};
