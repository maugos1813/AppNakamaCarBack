import { Prisma, type InventoryItem } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type InventoryItemRecord = InventoryItem;

export const inventoryRepository = {
  findById(id: string): Promise<InventoryItemRecord | null> {
    return prisma.inventoryItem.findUnique({ where: { id } });
  },

  findMany(): Promise<InventoryItemRecord[]> {
    return prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } });
  },

  create(data: Prisma.InventoryItemUncheckedCreateInput): Promise<InventoryItemRecord> {
    return prisma.inventoryItem.create({ data });
  },

  update(id: string, data: Prisma.InventoryItemUncheckedUpdateInput): Promise<InventoryItemRecord> {
    return prisma.inventoryItem.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.inventoryItem.delete({ where: { id } });
  },
};
