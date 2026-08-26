import { prisma } from '../../lib/prisma';

const OUTSTANDING_STATUSES = ['ISSUED', 'PARTIALLY_PAID'] as const;

interface MonthlyAmountRow {
  month: string;
  total: number | string | null;
}

export const financeRepository = {
  async sumInvoicedInPeriod(from: Date, to: Date) {
    const result = await prisma.invoice.aggregate({
      where: { issueDate: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
    });
    return Number(result._sum.totalAmount ?? 0);
  },

  async sumCollectedInPeriod(from: Date, to: Date) {
    const result = await prisma.payment.aggregate({
      where: { paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  },

  // Pre-tax revenue — VAT is collected on the government's behalf, not
  // company earnings, so profit is computed against subtotal, not totalAmount.
  async sumSubtotalInPeriod(from: Date, to: Date) {
    const result = await prisma.invoice.aggregate({
      where: { issueDate: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
      _sum: { subtotal: true },
    });
    return Number(result._sum.subtotal ?? 0);
  },

  // What the shop paid for the parts on invoiced (non-cancelled) work in the
  // period — the only cost basis stored today (see Part.unitCost). Labor and
  // other costs have no internal cost recorded, so they aren't netted out;
  // this is a partial profit figure, not the shop's true net margin.
  async sumPartsCostInPeriod(from: Date, to: Date) {
    const rows = await prisma.$queryRaw<{ total: number | string | null }[]>`
      SELECT SUM(p."unitCost" * p."quantity")::float as total
      FROM parts p
      JOIN invoices i ON i."vehicleEntryId" = p."vehicleEntryId"
      WHERE i."issueDate" >= ${from} AND i."issueDate" <= ${to} AND i."status" != 'CANCELLED'
    `;
    return Number(rows[0]?.total ?? 0);
  },

  async outstandingBalance() {
    const [invoiceTotals, paymentTotals] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: { in: [...OUTSTANDING_STATUSES] } },
        _sum: { totalAmount: true },
      }),
      prisma.payment.aggregate({
        where: { invoice: { status: { in: [...OUTSTANDING_STATUSES] } } },
        _sum: { amount: true },
      }),
    ]);
    return Number(invoiceTotals._sum.totalAmount ?? 0) - Number(paymentTotals._sum.amount ?? 0);
  },

  invoiceCountByStatus() {
    return prisma.invoice.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { totalAmount: true },
    });
  },

  paymentsByMethodInPeriod(from: Date, to: Date) {
    return prisma.payment.groupBy({
      by: ['method'],
      where: { paidAt: { gte: from, lte: to } },
      _count: { _all: true },
      _sum: { amount: true },
    });
  },

  /** Postgres date_trunc bucketing has no typed Prisma equivalent — raw SQL is the correct tool here. */
  invoicedByMonth(since: Date): Promise<MonthlyAmountRow[]> {
    return prisma.$queryRaw<MonthlyAmountRow[]>`
      SELECT to_char(date_trunc('month', "issueDate"), 'YYYY-MM') as month,
             SUM("totalAmount")::float as total
      FROM invoices
      WHERE "issueDate" >= ${since} AND "status" != 'CANCELLED'
      GROUP BY 1
      ORDER BY 1
    `;
  },

  collectedByMonth(since: Date): Promise<MonthlyAmountRow[]> {
    return prisma.$queryRaw<MonthlyAmountRow[]>`
      SELECT to_char(date_trunc('month', "paidAt"), 'YYYY-MM') as month,
             SUM("amount")::float as total
      FROM payments
      WHERE "paidAt" >= ${since}
      GROUP BY 1
      ORDER BY 1
    `;
  },

  overdueInvoices() {
    return prisma.invoice.findMany({
      where: { status: { in: [...OUTSTANDING_STATUSES] }, dueDate: { lt: new Date() } },
      include: { client: true },
      orderBy: { dueDate: 'asc' },
    });
  },

  /** One grouped query instead of one payment lookup per invoice. */
  async sumPaymentsByInvoiceIds(invoiceIds: string[]): Promise<Map<string, number>> {
    if (invoiceIds.length === 0) {
      return new Map();
    }
    const rows = await prisma.payment.groupBy({
      by: ['invoiceId'],
      where: { invoiceId: { in: invoiceIds } },
      _sum: { amount: true },
    });
    return new Map(rows.map((row) => [row.invoiceId, Number(row._sum.amount ?? 0)]));
  },
};
