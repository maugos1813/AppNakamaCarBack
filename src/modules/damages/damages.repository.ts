import { Prisma, type Damage } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type DamageRecord = Damage;

export const damagesRepository = {
  findById(id: string): Promise<DamageRecord | null> {
    return prisma.damage.findUnique({ where: { id } });
  },

  findByEntryId(vehicleEntryId: string): Promise<DamageRecord[]> {
    return prisma.damage.findMany({ where: { vehicleEntryId }, orderBy: { createdAt: 'desc' } });
  },

  create(data: Prisma.DamageUncheckedCreateInput): Promise<DamageRecord> {
    return prisma.damage.create({ data });
  },

  update(id: string, data: Prisma.DamageUncheckedUpdateInput): Promise<DamageRecord> {
    return prisma.damage.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.damage.delete({ where: { id } });
  },
};
