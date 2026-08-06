import { Prisma, type Invoice, type Payment } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const invoiceInclude = {
  client: true,
  vehicleEntry: { include: { vehicle: true } },
  items: true,
  payments: { orderBy: { paidAt: 'asc' } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;
export type InvoiceRecord = Invoice;

interface ListInvoicesFilters {
  clientId?: string;
  status?: Invoice['status'];
}

interface Pagination {
  page: number;
  pageSize: number;
}

export const invoicesRepository = {
  findById(id: string): Promise<InvoiceWithRelations | null> {
    return prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
  },

  findByVehicleEntryId(vehicleEntryId: string): Promise<InvoiceRecord | null> {
    return prisma.invoice.findUnique({ where: { vehicleEntryId } });
  },

  async findMany(
    filters: ListInvoicesFilters,
    { page, pageSize }: Pagination,
  ): Promise<{ items: InvoiceWithRelations[]; total: number }> {
    const where: Prisma.InvoiceWhereInput = {
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: invoiceInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { items, total };
  },

  create(data: Prisma.InvoiceUncheckedCreateInput): Promise<InvoiceRecord> {
    return prisma.invoice.create({ data });
  },

  update(id: string, data: Prisma.InvoiceUncheckedUpdateInput): Promise<InvoiceRecord> {
    return prisma.invoice.update({ where: { id }, data });
  },

  createItems(items: Prisma.InvoiceItemUncheckedCreateInput[]): Promise<Prisma.BatchPayload> {
    return prisma.invoiceItem.createMany({ data: items });
  },

  createPayment(data: Prisma.PaymentUncheckedCreateInput): Promise<Payment> {
    return prisma.payment.create({ data });
  },

  async sumPayments(invoiceId: string): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  },

  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  },
};
