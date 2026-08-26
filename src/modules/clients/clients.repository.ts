import { Prisma, type Client } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type ClientWithVehicles = Prisma.ClientGetPayload<{ include: { vehicles: true } }>;
export type ClientRecord = Client;

interface ListClientsFilters {
  search?: string;
  isCompany?: boolean;
  portalEnabled?: boolean;
}

interface Pagination {
  page: number;
  pageSize: number;
}

export const clientsRepository = {
  findById(id: string): Promise<ClientWithVehicles | null> {
    return prisma.client.findUnique({ where: { id }, include: { vehicles: true } });
  },

  // Scoped to portalEnabled — email isn't @unique at the DB level (plenty of
  // ordinary clients share a blank or duplicate email), but every caller of
  // this method (login, forgot-password, the enable-portal conflict check)
  // only ever cares about the one premium account using that email, if any.
  findByEmail(email: string): Promise<ClientRecord | null> {
    return prisma.client.findFirst({ where: { email, portalEnabled: true } });
  },

  async findMany(
    filters: ListClientsFilters,
    { page, pageSize }: Pagination,
  ): Promise<{ items: ClientRecord[]; total: number }> {
    const where: Prisma.ClientWhereInput = {
      ...(filters.isCompany !== undefined ? { isCompany: filters.isCompany } : {}),
      ...(filters.portalEnabled !== undefined ? { portalEnabled: filters.portalEnabled } : {}),
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
