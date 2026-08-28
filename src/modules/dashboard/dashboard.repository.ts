import { prisma } from '../../lib/prisma';

export const dashboardRepository = {
  async countEntriesByStatus() {
    return prisma.vehicleEntry.groupBy({ by: ['status'], _count: { _all: true } });
  },

  async countStagesInProgressByName() {
    return prisma.repairStage.groupBy({
      by: ['stage'],
      where: { status: 'IN_PROGRESS' },
      _count: { _all: true },
    });
  },

  countReadyForPickup() {
    return prisma.vehicleEntry.count({ where: { status: 'COMPLETED' } });
  },

  countPendingWorkRequests() {
    return prisma.workRequestItem.count({ where: { status: 'PENDING' } });
  },

  // Approximates "days since it was marked ready" with updatedAt — there's
  // no dedicated completedAt column, and in practice nothing else touches
  // an entry once it's COMPLETED and waiting on pickup.
  countStaleReadyForPickup(days: number) {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return prisma.vehicleEntry.count({ where: { status: 'COMPLETED', updatedAt: { lt: threshold } } });
  },

  // Mirrors finance.repository.ts's own OUTSTANDING_STATUSES + dueDate
  // check — kept as a separate lightweight count here rather than reusing
  // financeRepository.overdueInvoices(), which loads full invoice+client
  // records the dashboard doesn't need.
  countOverdueInvoices() {
    return prisma.invoice.count({
      where: { status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, dueDate: { lt: new Date() } },
    });
  },

  countClients() {
    return prisma.client.count();
  },

  countVehicles() {
    return prisma.vehicle.count();
  },

  recentActivity(limit: number) {
    return prisma.repairHistory.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicleEntry: { include: { vehicle: { include: { client: true } } } },
        performedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  },
};
