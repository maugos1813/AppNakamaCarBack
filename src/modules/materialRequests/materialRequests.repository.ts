import { Prisma, type MaterialRequest } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const materialRequestInclude = {
  createdBy: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.MaterialRequestInclude;

export type MaterialRequestWithRelations = Prisma.MaterialRequestGetPayload<{
  include: typeof materialRequestInclude;
}>;
export type MaterialRequestRecord = MaterialRequest;

interface ListFilters {
  status?: MaterialRequest['status'];
}

interface Pagination {
  page: number;
  pageSize: number;
}

export const materialRequestsRepository = {
  findById(id: string): Promise<MaterialRequestWithRelations | null> {
    return prisma.materialRequest.findUnique({ where: { id }, include: materialRequestInclude });
  },

  async findMany(
    filters: ListFilters,
    { page, pageSize }: Pagination,
  ): Promise<{ items: MaterialRequestWithRelations[]; total: number }> {
    const where: Prisma.MaterialRequestWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.materialRequest.findMany({
        where,
        include: materialRequestInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.materialRequest.count({ where }),
    ]);

    return { items, total };
  },

  create(data: Prisma.MaterialRequestUncheckedCreateInput): Promise<MaterialRequestRecord> {
    return prisma.materialRequest.create({ data });
  },

  update(id: string, data: Prisma.MaterialRequestUncheckedUpdateInput): Promise<MaterialRequestRecord> {
    return prisma.materialRequest.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.materialRequest.delete({ where: { id } });
  },
};
