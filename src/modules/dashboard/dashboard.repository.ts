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
