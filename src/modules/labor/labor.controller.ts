import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { laborService } from './labor.service';
import { createLaborItemSchema, updateLaborItemSchema } from './labor.validation';

export const laborController = {
  async list(req: Request, res: Response) {
    const items = await laborService.listByEntry(req.params.entryId as string);
    sendSuccess(res, { message: 'Labor items retrieved successfully.', data: items });
  },

  async create(req: Request, res: Response) {
    const input = createLaborItemSchema.parse(req.body);
    const item = await laborService.createLaborItem(req.params.entryId as string, input);
    sendSuccess(res, { statusCode: 201, message: 'Labor item created successfully.', data: item });
  },

  async update(req: Request, res: Response) {
    const input = updateLaborItemSchema.parse(req.body);
    const item = await laborService.updateLaborItem(req.params.id as string, input);
    sendSuccess(res, { message: 'Labor item updated successfully.', data: item });
  },

  async remove(req: Request, res: Response) {
    await laborService.deleteLaborItem(req.params.id as string);
    sendSuccess(res, { message: 'Labor item deleted successfully.' });
  },
};
