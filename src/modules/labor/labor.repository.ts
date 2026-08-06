import { Prisma, type LaborItem } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type LaborItemRecord = LaborItem;

export const laborRepository = {
  findById(id: string): Promise<LaborItemRecord | null> {
    return prisma.laborItem.findUnique({ where: { id } });
  },

  findByEntryId(vehicleEntryId: string): Promise<LaborItemRecord[]> {
    return prisma.laborItem.findMany({ where: { vehicleEntryId }, orderBy: { createdAt: 'desc' } });
  },

  create(data: Prisma.LaborItemUncheckedCreateInput): Promise<LaborItemRecord> {
    return prisma.laborItem.create({ data });
  },

  update(id: string, data: Prisma.LaborItemUncheckedUpdateInput): Promise<LaborItemRecord> {
    return prisma.laborItem.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.laborItem.delete({ where: { id } });
  },
};
