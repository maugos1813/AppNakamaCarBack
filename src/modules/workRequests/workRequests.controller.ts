import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { workRequestsService } from './workRequests.service';
import {
  createWorkRequestSchema,
  listWorkRequestsQuerySchema,
  setWorkRequestStatusSchema,
  updateWorkRequestSchema,
} from './workRequests.validation';

export const workRequestsController = {
  async listByEntry(req: Request, res: Response) {
    const items = await workRequestsService.listByEntry(req.params.entryId as string);
    sendSuccess(res, { message: 'Work requests retrieved successfully.', data: items });
  },

  async listAll(req: Request, res: Response) {
    const query = listWorkRequestsQuerySchema.parse(req.query);
    const result = await workRequestsService.listAll(query);
    sendSuccess(res, { message: 'Work requests retrieved successfully.', data: result });
  },

  async create(req: Request, res: Response) {
    const input = createWorkRequestSchema.parse(req.body);
    const item = await workRequestsService.createWorkRequest(
      req.params.entryId as string,
      input,
      req.user!.id,
      req.user!.fullName,
    );
    sendSuccess(res, { statusCode: 201, message: 'Work request created successfully.', data: item });
  },

  async update(req: Request, res: Response) {
    const input = updateWorkRequestSchema.parse(req.body);
    const item = await workRequestsService.updateWorkRequest(req.params.id as string, input, {
      id: req.user!.id,
      role: req.user!.role,
    });
    sendSuccess(res, { message: 'Work request updated successfully.', data: item });
  },

  async setStatus(req: Request, res: Response) {
    const input = setWorkRequestStatusSchema.parse(req.body);
    const item = await workRequestsService.setStatus(req.params.id as string, input);
    sendSuccess(res, { message: 'Work request status updated successfully.', data: item });
  },

  async remove(req: Request, res: Response) {
    await workRequestsService.deleteWorkRequest(req.params.id as string, { id: req.user!.id, role: req.user!.role });
    sendSuccess(res, { message: 'Work request deleted successfully.' });
  },
};
