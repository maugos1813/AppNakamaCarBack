import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { notificationsService } from './notifications.service';

export const notificationsController = {
  async listByEntry(req: Request, res: Response) {
    const notifications = await notificationsService.listByEntry(req.params.entryId as string);
    sendSuccess(res, { message: 'Notifications retrieved successfully.', data: notifications });
  },

  async listMine(req: Request, res: Response) {
    const notifications = await notificationsService.listMine(req.user!.id);
    sendSuccess(res, { message: 'Notifications retrieved successfully.', data: notifications });
  },

  async markRead(req: Request, res: Response) {
    const notification = await notificationsService.markRead(req.params.id as string, req.user!.id);
    sendSuccess(res, { message: 'Notification marked as read.', data: notification });
  },
};
