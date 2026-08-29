import { prisma } from '../../lib/prisma';

// Same outstanding-invoice statuses finance.repository.ts uses for "overdue".
const OUTSTANDING_STATUSES = ['ISSUED', 'PARTIALLY_PAID'] as const;

export const remindersRepository = {
  // completedAt is the precise timestamp; falls back to updatedAt for rows
  // COMPLETED before that column existed (mirrors dashboard.repository.ts).
  findStalePickups(staleThreshold: Date, resendThreshold: Date) {
    return prisma.vehicleEntry.findMany({
      where: {
        status: 'COMPLETED',
        OR: [{ completedAt: { lt: staleThreshold } }, { completedAt: null, updatedAt: { lt: staleThreshold } }],
        AND: [{ OR: [{ lastPickupReminderSentAt: null }, { lastPickupReminderSentAt: { lt: resendThreshold } }] }],
      },
      select: { id: true },
    });
  },

  markPickupReminderSent(id: string) {
    return prisma.vehicleEntry.update({ where: { id }, data: { lastPickupReminderSentAt: new Date() } });
  },

  findOverdueInvoices(resendThreshold: Date) {
    return prisma.invoice.findMany({
      where: {
        status: { in: [...OUTSTANDING_STATUSES] },
        dueDate: { lt: new Date() },
        OR: [{ lastOverdueReminderSentAt: null }, { lastOverdueReminderSentAt: { lt: resendThreshold } }],
      },
      select: { id: true },
    });
  },

  markOverdueReminderSent(id: string) {
    return prisma.invoice.update({ where: { id }, data: { lastOverdueReminderSentAt: new Date() } });
  },
};
