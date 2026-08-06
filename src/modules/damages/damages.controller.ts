import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { damagesService } from './damages.service';
import { createDamageSchema, updateDamageSchema } from './damages.validation';

export const damagesController = {
  async list(req: Request, res: Response) {
    const damages = await damagesService.listByEntry(req.params.entryId as string);
    sendSuccess(res, { message: 'Damages retrieved successfully.', data: damages });
  },

  async create(req: Request, res: Response) {
    const input = createDamageSchema.parse(req.body);
    const damage = await damagesService.createDamage(req.params.entryId as string, input);
    sendSuccess(res, { statusCode: 201, message: 'Damage created successfully.', data: damage });
  },

  async update(req: Request, res: Response) {
    const input = updateDamageSchema.parse(req.body);
    const damage = await damagesService.updateDamage(req.params.id as string, input);
    sendSuccess(res, { message: 'Damage updated successfully.', data: damage });
  },

  async remove(req: Request, res: Response) {
    await damagesService.deleteDamage(req.params.id as string);
    sendSuccess(res, { message: 'Damage deleted successfully.' });
  },
};
