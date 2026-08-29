import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { reportsService } from './reports.service';
import { mechanicProductivityQuerySchema } from './reports.validation';

export const reportsController = {
  async mechanicProductivity(req: Request, res: Response) {
    const query = mechanicProductivityQuerySchema.parse(req.query);
    const result = await reportsService.getMechanicProductivity(query.months);
    sendSuccess(res, { message: 'Mechanic productivity report retrieved successfully.', data: result });
  },
};
