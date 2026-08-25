import { Prisma, type Part } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type PartRecord = Part;

export const partsRepository = {
  findById(id: string): Promise<PartRecord | null> {
    return prisma.part.findUnique({ where: { id } });
  },

  findByEntryId(vehicleEntryId: string): Promise<PartRecord[]> {
    return prisma.part.findMany({ where: { vehicleEntryId }, orderBy: { createdAt: 'desc' } });
  },

  create(data: Prisma.PartUncheckedCreateInput): Promise<PartRecord> {
    return prisma.part.create({ data });
  },

  update(id: string, data: Prisma.PartUncheckedUpdateInput): Promise<PartRecord> {
    return prisma.part.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.part.delete({ where: { id } });
  },

  async approvePending(vehicleEntryId: string, approvedAt: Date): Promise<void> {
    await prisma.part.updateMany({ where: { vehicleEntryId, approvedAt: null }, data: { approvedAt } });
  },
};
