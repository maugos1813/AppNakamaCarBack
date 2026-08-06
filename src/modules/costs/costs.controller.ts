import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { costsService } from './costs.service';
import { createOtherCostSchema, updateOtherCostSchema } from './costs.validation';

export const costsController = {
  async list(req: Request, res: Response) {
    const items = await costsService.listByEntry(req.params.entryId as string);
    sendSuccess(res, { message: 'Other costs retrieved successfully.', data: items });
  },

  async create(req: Request, res: Response) {
    const input = createOtherCostSchema.parse(req.body);
    const cost = await costsService.createCost(req.params.entryId as string, input);
    sendSuccess(res, { statusCode: 201, message: 'Other cost created successfully.', data: cost });
  },

  async update(req: Request, res: Response) {
    const input = updateOtherCostSchema.parse(req.body);
    const cost = await costsService.updateCost(req.params.id as string, input);
    sendSuccess(res, { message: 'Other cost updated successfully.', data: cost });
  },

  async remove(req: Request, res: Response) {
    await costsService.deleteCost(req.params.id as string);
    sendSuccess(res, { message: 'Other cost deleted successfully.' });
  },
};
