import { prisma } from '../../lib/prisma';

export const reportsRepository = {
  // Small, focused rows — cheap enough at this app's scale to aggregate in
  // JS (see reports.service.ts) instead of a raw-SQL GROUP BY.
  findCompletedSince(since: Date) {
    return prisma.vehicleEntry.findMany({
      where: { completedAt: { gte: since }, completedByUserId: { not: null } },
      select: { completedByUserId: true, completedAt: true, entryDate: true },
    });
  },

  findActiveMechanics() {
    return prisma.user.findMany({
      where: { isActive: true, role: { name: 'MECHANIC' } },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
  },

  findUsersByIds(ids: string[]) {
    return prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } });
  },
};
