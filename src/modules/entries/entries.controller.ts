import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { entriesService } from './entries.service';
import {
  changeEntryStatusSchema,
  createEntrySchema,
  listEntriesQuerySchema,
  updateEntrySchema,
} from './entries.validation';

export const entriesController = {
  async list(req: Request, res: Response) {
    const query = listEntriesQuerySchema.parse(req.query);
    const result = await entriesService.listEntries(query);
    sendSuccess(res, { message: 'Vehicle entries retrieved successfully.', data: result });
  },

  async getById(req: Request, res: Response) {
    const entry = await entriesService.getEntryById(req.params.id as string);
    sendSuccess(res, { message: 'Vehicle entry retrieved successfully.', data: entry });
  },

  async getHistory(req: Request, res: Response) {
    const history = await entriesService.getHistory(req.params.id as string);
    sendSuccess(res, { message: 'Vehicle entry history retrieved successfully.', data: history });
  },

  async getEstimate(req: Request, res: Response) {
    const estimate = await entriesService.getEstimate(req.params.id as string);
    sendSuccess(res, { message: 'Vehicle entry estimate retrieved successfully.', data: estimate });
  },

  async create(req: Request, res: Response) {
    const input = createEntrySchema.parse(req.body);
    const entry = await entriesService.createEntry(input, req.user!.id);
    sendSuccess(res, { statusCode: 201, message: 'Vehicle entry created successfully.', data: entry });
  },

  async update(req: Request, res: Response) {
    const input = updateEntrySchema.parse(req.body);
    const entry = await entriesService.updateEntry(req.params.id as string, input);
    sendSuccess(res, { message: 'Vehicle entry updated successfully.', data: entry });
  },

  async changeStatus(req: Request, res: Response) {
    const input = changeEntryStatusSchema.parse(req.body);
    const entry = await entriesService.changeStatus(req.params.id as string, input, req.user!.id);
    sendSuccess(res, { message: 'Vehicle entry status updated successfully.', data: entry });
  },
};
