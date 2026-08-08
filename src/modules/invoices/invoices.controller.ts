import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { invoicesService } from './invoices.service';
import { createInvoiceSchema, createPaymentSchema, listInvoicesQuerySchema } from './invoices.validation';

export const invoicesController = {
  async list(req: Request, res: Response) {
    const query = listInvoicesQuerySchema.parse(req.query);
    const result = await invoicesService.listInvoices(query);
    sendSuccess(res, { message: 'Invoices retrieved successfully.', data: result });
  },

  async getById(req: Request, res: Response) {
    const invoice = await invoicesService.getInvoiceById(req.params.id as string);
    sendSuccess(res, { message: 'Invoice retrieved successfully.', data: invoice });
  },

  async createForEntry(req: Request, res: Response) {
    const input = createInvoiceSchema.parse(req.body);
    const invoice = await invoicesService.createInvoiceForEntry(req.params.entryId as string, input);
    sendSuccess(res, { statusCode: 201, message: 'Invoice created as draft.', data: invoice });
  },

  async issue(req: Request, res: Response) {
    const invoice = await invoicesService.issueInvoice(req.params.id as string);
    sendSuccess(res, { message: 'Invoice issued successfully.', data: invoice });
  },

  async cancel(req: Request, res: Response) {
    const invoice = await invoicesService.cancelInvoice(req.params.id as string);
    sendSuccess(res, { message: 'Invoice cancelled successfully.', data: invoice });
  },

  async recordPayment(req: Request, res: Response) {
    const input = createPaymentSchema.parse(req.body);
    const payment = await invoicesService.recordPayment(req.params.id as string, input, req.user!.id);
    sendSuccess(res, { statusCode: 201, message: 'Payment recorded successfully.', data: payment });
  },

  async downloadPdf(req: Request, res: Response) {
    const { buffer, invoiceNumber } = await invoicesService.getInvoicePdf(req.params.id as string);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fattura-${invoiceNumber.replace('/', '-')}.pdf"`);
    res.send(buffer);
  },
};
