import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { materialRequestsService } from './materialRequests.service';
import {
  createMaterialRequestSchema,
  listMaterialRequestsQuerySchema,
  setMaterialRequestStatusSchema,
} from './materialRequests.validation';

export const materialRequestsController = {
  async listAll(req: Request, res: Response) {
    const query = listMaterialRequestsQuerySchema.parse(req.query);
    const result = await materialRequestsService.listAll(query);
    sendSuccess(res, { message: 'Material requests retrieved successfully.', data: result });
  },

  async create(req: Request, res: Response) {
    const input = createMaterialRequestSchema.parse(req.body);
    const item = await materialRequestsService.createRequest(input, req.user!.id);
    sendSuccess(res, { statusCode: 201, message: 'Material request created successfully.', data: item });
  },

  async setStatus(req: Request, res: Response) {
    const input = setMaterialRequestStatusSchema.parse(req.body);
    const item = await materialRequestsService.setStatus(req.params.id as string, input);
    sendSuccess(res, { message: 'Material request status updated successfully.', data: item });
  },

  async remove(req: Request, res: Response) {
    await materialRequestsService.deleteRequest(req.params.id as string, {
      id: req.user!.id,
      role: req.user!.role,
    });
    sendSuccess(res, { message: 'Material request deleted successfully.' });
  },
};
