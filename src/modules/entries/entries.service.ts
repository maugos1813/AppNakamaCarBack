import type { VehicleEntryStatus } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { roundCurrency } from '../../utils/money';
import { vehiclesRepository } from '../vehicles/vehicles.repository';
import { laborRepository } from '../labor/labor.repository';
import { partsRepository } from '../parts/parts.repository';
import { costsRepository } from '../costs/costs.repository';
import { repairsService } from '../repairs/repairs.service';
import { notificationsService } from '../notifications/notifications.service';
import { entriesRepository } from './entries.repository';
import type {
  ChangeEntryStatusInput,
  CreateEntryInput,
  ListEntriesQuery,
  UpdateEntryInput,
} from './entries.validation';

const ALLOWED_TRANSITIONS: Record<VehicleEntryStatus, VehicleEntryStatus[]> = {
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['DELIVERED', 'IN_PROGRESS'],
  DELIVERED: [],
  CANCELLED: [],
};

export const entriesService = {
  async listEntries(query: ListEntriesQuery) {
    const { items, total } = await entriesRepository.findMany(
      { vehicleId: query.vehicleId, clientId: query.clientId, status: query.status },
      { page: query.page, pageSize: query.pageSize },
    );
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total } };
  },

  async getEntryById(id: string) {
    const entry = await entriesRepository.findById(id);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }
    return entry;
  },

  async getEstimate(id: string) {
    const entry = await entriesRepository.findById(id);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }

    const [laborItems, parts, otherCosts] = await Promise.all([
      laborRepository.findByEntryId(id),
      partsRepository.findByEntryId(id),
      costsRepository.findByEntryId(id),
    ]);

    const laborTotal = roundCurrency(laborItems.reduce((sum, item) => sum + Number(item.total), 0));
    const partsTotal = roundCurrency(parts.reduce((sum, item) => sum + Number(item.total), 0));
    const otherCostsTotal = roundCurrency(otherCosts.reduce((sum, item) => sum + Number(item.amount), 0));

    return {
      labor: { items: laborItems, total: laborTotal },
      parts: { items: parts, total: partsTotal },
      otherCosts: { items: otherCosts, total: otherCostsTotal },
      grandTotal: roundCurrency(laborTotal + partsTotal + otherCostsTotal),
    };
  },

  async getHistory(id: string) {
    const entry = await entriesRepository.findById(id);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }
    return entriesRepository.listHistory(id);
  },

  async createEntry(input: CreateEntryInput, receivedByUserId: string) {
    const vehicle = await vehiclesRepository.findById(input.vehicleId);
    if (!vehicle) {
      throw ApiError.badRequest('vehicleId does not match an existing vehicle.');
    }

    const entry = await entriesRepository.create({ ...input, receivedByUserId });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: entry.id,
      eventType: 'STATUS_CHANGED',
      description: 'Vehicle received. Status set to IN_PROGRESS.',
      performedByUserId: receivedByUserId,
    });

    await repairsService.createDefaultStages(entry.id);

    return entry;
  },

  async updateEntry(id: string, input: UpdateEntryInput) {
    const existing = await entriesRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Vehicle entry not found.');
    }
    return entriesRepository.update(id, input);
  },

  async changeStatus(id: string, input: ChangeEntryStatusInput, performedByUserId: string) {
    const existing = await entriesRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Vehicle entry not found.');
    }

    if (existing.status === input.status) {
      throw ApiError.badRequest(`Vehicle entry is already in status ${input.status}.`);
    }

    const allowed = ALLOWED_TRANSITIONS[existing.status];
    if (!allowed.includes(input.status)) {
      throw ApiError.badRequest(
        `Cannot change status from ${existing.status} to ${input.status}.`,
      );
    }

    const updated = await entriesRepository.update(id, { status: input.status });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: id,
      eventType: 'STATUS_CHANGED',
      description: `Status changed from ${existing.status} to ${input.status}.${input.notes ? ` ${input.notes}` : ''}`,
      performedByUserId,
    });

    await notificationsService.notifyEntryStatusChange(id, input.status);

    return updated;
  },
};
