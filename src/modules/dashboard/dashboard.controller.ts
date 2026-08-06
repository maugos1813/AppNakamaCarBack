import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { dashboardService } from './dashboard.service';
import { activityQuerySchema } from './dashboard.validation';

export const dashboardController = {
  async summary(_req: Request, res: Response) {
    const summary = await dashboardService.getSummary();
    sendSuccess(res, { message: 'Dashboard summary retrieved successfully.', data: summary });
  },

  async activity(req: Request, res: Response) {
    const query = activityQuerySchema.parse(req.query);
    const activity = await dashboardService.getActivity(query.limit);
    sendSuccess(res, { message: 'Recent activity retrieved successfully.', data: activity });
  },
};
