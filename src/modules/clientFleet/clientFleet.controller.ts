import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/ApiResponse';
import { rejectEstimateSchema } from '../clientPortal/clientPortal.validation';
import { clientFleetService } from './clientFleet.service';

const listVehiclesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const clientFleetController = {
  async listVehicles(req: Request, res: Response) {
    const query = listVehiclesQuerySchema.parse(req.query);
    const result = await clientFleetService.listVehicleEntries(req.clientSession!.id, query);
    sendSuccess(res, { message: 'Vehicles retrieved successfully.', data: result });
  },

  async getEntry(req: Request, res: Response) {
    const summary = await clientFleetService.getEntrySummary(req.clientSession!.id, req.params.entryId as string);
    sendSuccess(res, { message: 'Vehicle entry retrieved successfully.', data: summary });
  },

  async approveEstimate(req: Request, res: Response) {
    const entry = await clientFleetService.approveEstimate(req.clientSession!.id, req.params.entryId as string);
    sendSuccess(res, { message: 'Estimate approved successfully.', data: entry });
  },

  async rejectEstimate(req: Request, res: Response) {
    const input = rejectEstimateSchema.parse(req.body);
    const entry = await clientFleetService.rejectEstimate(req.clientSession!.id, req.params.entryId as string, input);
    sendSuccess(res, { message: 'Estimate rejected successfully.', data: entry });
  },

  async downloadInvoicePdf(req: Request, res: Response) {
    const { buffer, invoiceNumber } = await clientFleetService.getInvoicePdf(
      req.clientSession!.id,
      req.params.entryId as string,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fattura-${invoiceNumber.replace('/', '-')}.pdf"`);
    res.send(buffer);
  },

  async uploadPaymentReceipt(req: Request, res: Response) {
    if (!req.file) {
      throw ApiError.badRequest('Receipt file is required (field name: "receipt").');
    }
    const receipt = await clientFleetService.uploadPaymentReceipt(
      req.clientSession!.id,
      req.params.entryId as string,
      req.file,
    );
    sendSuccess(res, { statusCode: 201, message: 'Payment receipt uploaded successfully.', data: receipt });
  },

  async requestOfficePayment(req: Request, res: Response) {
    const invoice = await clientFleetService.requestOfficePayment(req.clientSession!.id, req.params.entryId as string);
    sendSuccess(res, { message: 'Office payment request recorded successfully.', data: invoice });
  },
};
