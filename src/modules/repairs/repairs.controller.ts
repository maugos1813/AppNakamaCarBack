import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { repairsService } from './repairs.service';
import { updateStageSchema } from './repairs.validation';

export const repairsController = {
  async list(req: Request, res: Response) {
    const stages = await repairsService.listByEntry(req.params.entryId as string);
    sendSuccess(res, { message: 'Repair stages retrieved successfully.', data: stages });
  },

  async update(req: Request, res: Response) {
    const input = updateStageSchema.parse(req.body);
    const stage = await repairsService.updateStage(req.params.id as string, input, req.user!.id);
    sendSuccess(res, { message: 'Repair stage updated successfully.', data: stage });
  },
};
