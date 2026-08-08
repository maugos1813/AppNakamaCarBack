import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { clientPortalService } from './clientPortal.service';
import { rejectEstimateSchema } from './clientPortal.validation';

export const clientPortalController = {
  async getSummary(req: Request, res: Response) {
    const summary = await clientPortalService.getSummary(req.clientAccess!.entryId);
    sendSuccess(res, { message: 'Tracking summary retrieved successfully.', data: summary });
  },

  async approveEstimate(req: Request, res: Response) {
    const entry = await clientPortalService.approveEstimate(req.clientAccess!.entryId);
    sendSuccess(res, { message: 'Estimate approved successfully.', data: entry });
  },

  async rejectEstimate(req: Request, res: Response) {
    const input = rejectEstimateSchema.parse(req.body);
    const entry = await clientPortalService.rejectEstimate(req.clientAccess!.entryId, input);
    sendSuccess(res, { message: 'Estimate rejected successfully.', data: entry });
  },

  async downloadInvoicePdf(req: Request, res: Response) {
    const { buffer, invoiceNumber } = await clientPortalService.getInvoicePdf(req.clientAccess!.entryId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fattura-${invoiceNumber.replace('/', '-')}.pdf"`);
    res.send(buffer);
  },
};
