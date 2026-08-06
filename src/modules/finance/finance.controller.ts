import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { financeService } from './finance.service';
import { financeSummaryQuerySchema } from './finance.validation';

export const financeController = {
  async summary(req: Request, res: Response) {
    const query = financeSummaryQuerySchema.parse(req.query);
    const summary = await financeService.getSummary(query);
    sendSuccess(res, { message: 'Finance summary retrieved successfully.', data: summary });
  },

  async overdue(_req: Request, res: Response) {
    const invoices = await financeService.getOverdueInvoices();
    sendSuccess(res, { message: 'Overdue invoices retrieved successfully.', data: invoices });
  },
};
