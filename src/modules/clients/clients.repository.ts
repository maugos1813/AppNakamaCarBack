import { Prisma, type Client } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type ClientWithVehicles = Prisma.ClientGetPayload<{ include: { vehicles: true } }>;
export type ClientRecord = Client;

interface ListClientsFilters {
  search?: string;
  isCompany?: boolean;
}

interface Pagination {
  page: number;
  pageSize: number;
}

export const clientsRepository = {
  findById(id: string): Promise<ClientWithVehicles | null> {
    return prisma.client.findUnique({ where: { id }, include: { vehicles: true } });
  },

  async findMany(
    filters: ListClientsFilters,
    { page, pageSize }: Pagination,
  ): Promise<{ items: ClientRecord[]; total: number }> {
    const where: Prisma.ClientWhereInput = {
      ...(filters.isCompany !== undefined ? { isCompany: filters.isCompany } : {}),
      ...(filters.search
        ? {
            OR: [
              { fullName: { contains: filters.search, mode: 'insensitive' } },
              { companyName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
              { phone: { contains: filters.search, mode: 'insensitive' } },
              { fiscalCode: { contains: filters.search, mode: 'insensitive' } },
              { vatNumber: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.client.count({ where }),
    ]);

    return { items, total };
  },

  create(data: Prisma.ClientCreateInput): Promise<ClientRecord> {
    return prisma.client.create({ data });
  },

  update(id: string, data: Prisma.ClientUpdateInput): Promise<ClientRecord> {
    return prisma.client.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.client.delete({ where: { id } });
  },
};
