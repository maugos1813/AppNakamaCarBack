import { Prisma, type VehiclePhoto } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type PhotoRecord = VehiclePhoto;

export const photosRepository = {
  findById(id: string): Promise<PhotoRecord | null> {
    return prisma.vehiclePhoto.findUnique({ where: { id } });
  },

  findByEntryId(vehicleEntryId: string): Promise<PhotoRecord[]> {
    return prisma.vehiclePhoto.findMany({
      where: { vehicleEntryId },
      orderBy: { createdAt: 'desc' },
    });
  },

  create(data: Prisma.VehiclePhotoUncheckedCreateInput): Promise<PhotoRecord> {
    return prisma.vehiclePhoto.create({ data });
  },

  async delete(id: string): Promise<void> {
    await prisma.vehiclePhoto.delete({ where: { id } });
  },
};
