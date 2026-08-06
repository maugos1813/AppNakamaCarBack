import { z } from 'zod';

export const createInvoiceSchema = z.object({
  taxRate: z.coerce.number().min(0).max(100).optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const paymentMethodSchema = z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER']);

export const createPaymentSchema = z.object({
  amount: z.coerce.number().positive('amount must be greater than 0.'),
  method: paymentMethodSchema,
  paidAt: z.coerce.date().optional(),
  reference: z.string().optional(),
});

export const listInvoicesQuerySchema = z.object({
  clientId: z.string().optional(),
  status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
