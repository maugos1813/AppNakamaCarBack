import { Prisma, type VehicleEntry, type RepairHistoryEventType } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const entryInclude = {
  vehicle: { include: { client: true } },
  receivedBy: { select: { id: true, fullName: true, email: true } },
  // Included on both the single-entry and list responses so a Kanban-style
  // view can place each entry in the right column — and highlight "my
  // assigned stages" — from the list call alone, with no per-entry N+1
  // follow-up request to GET /entries/:id/stages.
  stages: {
    orderBy: { order: 'asc' },
    include: { assignedMechanic: { select: { id: true, fullName: true, email: true } } },
  },
} satisfies Prisma.VehicleEntryInclude;

export type EntryWithRelations = Prisma.VehicleEntryGetPayload<{ include: typeof entryInclude }>;
export type EntryRecord = VehicleEntry;

interface ListEntriesFilters {
  vehicleId?: string;
  clientId?: string;
  status?: VehicleEntry['status'];
}

interface Pagination {
  page: number;
  pageSize: number;
}

export const entriesRepository = {
  findById(id: string): Promise<EntryWithRelations | null> {
    return prisma.vehicleEntry.findUnique({ where: { id }, include: entryInclude });
  },

  async findMany(
    filters: ListEntriesFilters,
    { page, pageSize }: Pagination,
  ): Promise<{ items: EntryWithRelations[]; total: number }> {
    const where: Prisma.VehicleEntryWhereInput = {
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters.clientId ? { vehicle: { clientId: filters.clientId } } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.vehicleEntry.findMany({
        where,
        include: entryInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.vehicleEntry.count({ where }),
    ]);

    return { items, total };
  },

  create(data: Prisma.VehicleEntryUncheckedCreateInput): Promise<EntryRecord> {
    return prisma.vehicleEntry.create({ data });
  },

  update(id: string, data: Prisma.VehicleEntryUncheckedUpdateInput): Promise<EntryRecord> {
    return prisma.vehicleEntry.update({ where: { id }, data });
  },

  createHistoryEvent(data: {
    vehicleEntryId: string;
    eventType: RepairHistoryEventType;
    description: string;
    performedByUserId?: string;
  }) {
    return prisma.repairHistory.create({ data });
  },

  listHistory(vehicleEntryId: string) {
    return prisma.repairHistory.findMany({
      where: { vehicleEntryId },
      include: { performedBy: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },
};
