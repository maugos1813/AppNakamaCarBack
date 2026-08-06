import { Prisma, type Vehicle } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type VehicleWithClient = Prisma.VehicleGetPayload<{ include: { client: true } }>;
export type VehicleRecord = Vehicle;

interface ListVehiclesFilters {
  clientId?: string;
  search?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
}

export const vehiclesRepository = {
  findById(id: string): Promise<VehicleWithClient | null> {
    return prisma.vehicle.findUnique({ where: { id }, include: { client: true } });
  },

  async findMany(
    filters: ListVehiclesFilters,
    { page, pageSize }: Pagination,
  ): Promise<{ items: VehicleWithClient[]; total: number }> {
    const where: Prisma.VehicleWhereInput = {
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.search
        ? {
            OR: [
              { licensePlate: { contains: filters.search, mode: 'insensitive' } },
              { vin: { contains: filters.search, mode: 'insensitive' } },
              { make: { contains: filters.search, mode: 'insensitive' } },
              { model: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: { client: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.vehicle.count({ where }),
    ]);

    return { items, total };
  },

  create(data: Prisma.VehicleUncheckedCreateInput): Promise<VehicleRecord> {
    return prisma.vehicle.create({ data });
  },

  update(id: string, data: Prisma.VehicleUncheckedUpdateInput): Promise<VehicleRecord> {
    return prisma.vehicle.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.vehicle.delete({ where: { id } });
  },
};
