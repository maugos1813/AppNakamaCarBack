import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { partsService } from './parts.service';
import { createPartSchema, updatePartSchema } from './parts.validation';

export const partsController = {
  async list(req: Request, res: Response) {
    const items = await partsService.listByEntry(req.params.entryId as string);
    sendSuccess(res, { message: 'Parts retrieved successfully.', data: items });
  },

  async create(req: Request, res: Response) {
    const input = createPartSchema.parse(req.body);
    const part = await partsService.createPart(req.params.entryId as string, input);
    sendSuccess(res, { statusCode: 201, message: 'Part created successfully.', data: part });
  },

  async update(req: Request, res: Response) {
    const input = updatePartSchema.parse(req.body);
    const part = await partsService.updatePart(req.params.id as string, input);
    sendSuccess(res, { message: 'Part updated successfully.', data: part });
  },

  async remove(req: Request, res: Response) {
    await partsService.deletePart(req.params.id as string);
    sendSuccess(res, { message: 'Part deleted successfully.' });
  },
};
