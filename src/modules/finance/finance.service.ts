import { roundCurrency } from '../../utils/money';
import { financeRepository } from './finance.repository';
import type { FinanceSummaryQuery } from './finance.validation';

function lastTwelveMonthsKeys(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export const financeService = {
  async getSummary(query: FinanceSummaryQuery) {
    const now = new Date();
    const from = query.from ?? new Date(now.getFullYear(), 0, 1);
    const to = query.to ?? now;

    const [totalInvoiced, totalCollected, outstandingBalance, byStatusRaw, byMethodRaw, subtotalInPeriod, partsCostInPeriod] =
      await Promise.all([
        financeRepository.sumInvoicedInPeriod(from, to),
        financeRepository.sumCollectedInPeriod(from, to),
        financeRepository.outstandingBalance(),
        financeRepository.invoiceCountByStatus(),
        financeRepository.paymentsByMethodInPeriod(from, to),
        financeRepository.sumSubtotalInPeriod(from, to),
        financeRepository.sumPartsCostInPeriod(from, to),
      ]);

    const monthKeys = lastTwelveMonthsKeys();
    const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const [invoicedByMonthRaw, collectedByMonthRaw] = await Promise.all([
      financeRepository.invoicedByMonth(since),
      financeRepository.collectedByMonth(since),
    ]);

    const revenueByMonth = monthKeys.map((month) => ({
      month,
      invoiced: Number(invoicedByMonthRaw.find((row) => row.month === month)?.total ?? 0),
      collected: Number(collectedByMonthRaw.find((row) => row.month === month)?.total ?? 0),
    }));

    return {
      period: { from, to },
      totalInvoiced: roundCurrency(totalInvoiced),
      totalCollected: roundCurrency(totalCollected),
      outstandingBalance: roundCurrency(outstandingBalance),
      byStatus: byStatusRaw.map((row) => ({
        status: row.status,
        count: row._count._all,
        totalAmount: roundCurrency(Number(row._sum.totalAmount ?? 0)),
      })),
      byPaymentMethod: byMethodRaw.map((row) => ({
        method: row.method,
        count: row._count._all,
        totalAmount: roundCurrency(Number(row._sum.amount ?? 0)),
      })),
      revenueByMonth,
      // Partial profit view — only nets out parts cost (the one cost basis
      // the system tracks today). Labor and other costs have no stored
      // internal cost, so they're counted as full revenue here.
      profit: {
        revenue: roundCurrency(subtotalInPeriod),
        partsCost: roundCurrency(partsCostInPeriod),
        estimatedProfit: roundCurrency(subtotalInPeriod - partsCostInPeriod),
      },
    };
  },

  async getOverdueInvoices() {
    const invoices = await financeRepository.overdueInvoices();
    const paidByInvoiceId = await financeRepository.sumPaymentsByInvoiceIds(
      invoices.map((invoice) => invoice.id),
    );

    return invoices.map((invoice) => {
      const amountPaid = roundCurrency(paidByInvoiceId.get(invoice.id) ?? 0);
      return {
        ...invoice,
        amountPaid,
        amountDue: roundCurrency(Number(invoice.totalAmount) - amountPaid),
      };
    });
  },
};
