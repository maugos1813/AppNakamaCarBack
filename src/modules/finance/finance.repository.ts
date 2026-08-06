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
};
