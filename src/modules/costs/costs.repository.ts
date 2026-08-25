import { Prisma, type OtherCost } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type OtherCostRecord = OtherCost;

export const costsRepository = {
  findById(id: string): Promise<OtherCostRecord | null> {
    return prisma.otherCost.findUnique({ where: { id } });
  },

  findByEntryId(vehicleEntryId: string): Promise<OtherCostRecord[]> {
    return prisma.otherCost.findMany({ where: { vehicleEntryId }, orderBy: { createdAt: 'desc' } });
  },

  create(data: Prisma.OtherCostUncheckedCreateInput): Promise<OtherCostRecord> {
    return prisma.otherCost.create({ data });
  },

  update(id: string, data: Prisma.OtherCostUncheckedUpdateInput): Promise<OtherCostRecord> {
    return prisma.otherCost.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.otherCost.delete({ where: { id } });
  },

  async approvePending(vehicleEntryId: string, approvedAt: Date): Promise<void> {
    await prisma.otherCost.updateMany({ where: { vehicleEntryId, approvedAt: null }, data: { approvedAt } });
  },
};
