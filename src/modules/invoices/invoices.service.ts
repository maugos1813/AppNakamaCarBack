import { ApiError } from '../../utils/ApiError';
import { roundCurrency } from '../../utils/money';
import { entriesRepository } from '../entries/entries.repository';
import { entriesService } from '../entries/entries.service';
import { invoicesRepository } from './invoices.repository';
import type { CreateInvoiceInput, CreatePaymentInput, ListInvoicesQuery } from './invoices.validation';

const DEFAULT_TAX_RATE = 22;

async function withPaymentSummary(invoiceId: string, totalAmount: number) {
  const amountPaid = roundCurrency(await invoicesRepository.sumPayments(invoiceId));
  return { amountPaid, amountDue: roundCurrency(totalAmount - amountPaid) };
}

export const invoicesService = {
  async listInvoices(query: ListInvoicesQuery) {
    const { items, total } = await invoicesRepository.findMany(
      { clientId: query.clientId, status: query.status },
      { page: query.page, pageSize: query.pageSize },
    );
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total } };
  },

  async getInvoiceById(id: string) {
    const invoice = await invoicesRepository.findById(id);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found.');
    }
    const summary = await withPaymentSummary(id, Number(invoice.totalAmount));
    return { ...invoice, ...summary };
  },

  async createInvoiceForEntry(vehicleEntryId: string, input: CreateInvoiceInput) {
    const entry = await entriesRepository.findById(vehicleEntryId);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }

    const existing = await invoicesRepository.findByVehicleEntryId(vehicleEntryId);
    if (existing) {
      throw ApiError.conflict('This vehicle entry already has an invoice.');
    }

    const estimate = await entriesService.getEstimate(vehicleEntryId);
    if (estimate.grandTotal <= 0) {
      throw ApiError.badRequest('Cannot create an invoice with no billable items.');
    }

    const taxRate = input.taxRate ?? DEFAULT_TAX_RATE;
    const subtotal = estimate.grandTotal;
    const taxAmount = roundCurrency(subtotal * (taxRate / 100));
    const totalAmount = roundCurrency(subtotal + taxAmount);

    return invoicesRepository.transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          vehicleEntryId,
          clientId: entry.vehicle.clientId,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          dueDate: input.dueDate,
          notes: input.notes,
        },
      });

      const items = [
        ...estimate.labor.items.map((item) => ({
          description: `${item.description} (${item.hours}h)`,
          quantity: item.hours,
          unitPrice: item.hourlyRate,
          total: item.total,
        })),
        ...estimate.parts.items.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        ...estimate.otherCosts.items.map((item) => ({
          description: item.description,
          quantity: 1,
          unitPrice: item.amount,
          total: item.amount,
        })),
      ];

      await tx.invoiceItem.createMany({
        data: items.map((item) => ({ ...item, invoiceId: invoice.id })),
      });

      return invoice;
    });
  },

  async issueInvoice(id: string) {
    const invoice = await invoicesRepository.findById(id);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found.');
    }
    if (invoice.status !== 'DRAFT') {
      throw ApiError.badRequest(`Only DRAFT invoices can be issued (current status: ${invoice.status}).`);
    }

    const issued = await invoicesRepository.transaction(async (tx) => {
      const year = new Date().getFullYear();
      const existingThisYear = await tx.invoice.findMany({
        where: { invoiceNumber: { endsWith: `/${year}` } },
        select: { invoiceNumber: true },
      });
      const maxSequence = existingThisYear.reduce((max, inv) => {
        const sequence = Number(inv.invoiceNumber?.split('/')[0]);
        return Number.isFinite(sequence) && sequence > max ? sequence : max;
      }, 0);

      return tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: `${maxSequence + 1}/${year}`,
          issueDate: new Date(),
          status: 'ISSUED',
        },
      });
    });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: invoice.vehicleEntryId,
      eventType: 'INVOICE_ISSUED',
      description: `Invoice ${issued.invoiceNumber} issued for €${issued.totalAmount}.`,
    });

    return issued;
  },

  async cancelInvoice(id: string) {
    const invoice = await invoicesRepository.findById(id);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found.');
    }
    if (invoice.status !== 'DRAFT' && invoice.status !== 'ISSUED') {
      throw ApiError.badRequest(`Cannot cancel an invoice with status ${invoice.status}.`);
    }

    const amountPaid = await invoicesRepository.sumPayments(id);
    if (amountPaid > 0) {
      throw ApiError.badRequest('Cannot cancel an invoice that already has payments recorded.');
    }

    return invoicesRepository.update(id, { status: 'CANCELLED' });
  },

  async recordPayment(invoiceId: string, input: CreatePaymentInput, recordedByUserId: string) {
    const invoice = await invoicesRepository.findById(invoiceId);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found.');
    }
    if (invoice.status !== 'ISSUED' && invoice.status !== 'PARTIALLY_PAID') {
      throw ApiError.badRequest(`Cannot record a payment for an invoice with status ${invoice.status}.`);
    }

    const amountPaid = await invoicesRepository.sumPayments(invoiceId);
    const remaining = roundCurrency(Number(invoice.totalAmount) - amountPaid);
    if (input.amount > remaining) {
      throw ApiError.badRequest(`Payment of €${input.amount} exceeds the remaining balance of €${remaining}.`);
    }

    const payment = await invoicesRepository.createPayment({
      invoiceId,
      amount: input.amount,
      method: input.method,
      paidAt: input.paidAt,
      reference: input.reference,
      recordedByUserId,
    });

    const newAmountPaid = roundCurrency(amountPaid + input.amount);
    const newStatus = newAmountPaid >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';
    await invoicesRepository.update(invoiceId, { status: newStatus });

    return payment;
  },
};
