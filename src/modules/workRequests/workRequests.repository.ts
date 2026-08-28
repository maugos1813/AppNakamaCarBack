import { Prisma, type WorkRequestItem } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const workRequestInclude = {
  vehicleEntry: { include: { vehicle: { include: { client: true } } } },
  createdBy: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.WorkRequestItemInclude;

export type WorkRequestWithRelations = Prisma.WorkRequestItemGetPayload<{ include: typeof workRequestInclude }>;
export type WorkRequestRecord = WorkRequestItem;

interface ListFilters {
  status?: WorkRequestItem['status'];
}

interface Pagination {
  page: number;
  pageSize: number;
}

export const workRequestsRepository = {
  findById(id: string): Promise<WorkRequestWithRelations | null> {
    return prisma.workRequestItem.findUnique({ where: { id }, include: workRequestInclude });
  },

  findByEntryId(vehicleEntryId: string): Promise<WorkRequestRecord[]> {
    return prisma.workRequestItem.findMany({ where: { vehicleEntryId }, orderBy: { createdAt: 'desc' } });
  },

  async findMany(
    filters: ListFilters,
    { page, pageSize }: Pagination,
  ): Promise<{ items: WorkRequestWithRelations[]; total: number }> {
    const where: Prisma.WorkRequestItemWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.workRequestItem.findMany({
        where,
        include: workRequestInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.workRequestItem.count({ where }),
    ]);

    return { items, total };
  },

  create(data: Prisma.WorkRequestItemUncheckedCreateInput): Promise<WorkRequestRecord> {
    return prisma.workRequestItem.create({ data });
  },

  update(id: string, data: Prisma.WorkRequestItemUncheckedUpdateInput): Promise<WorkRequestRecord> {
    return prisma.workRequestItem.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.workRequestItem.delete({ where: { id } });
  },
};
