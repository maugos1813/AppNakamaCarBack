import type { VehicleEntryStatus } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { roundCurrency } from '../../utils/money';
import { TAX_RATE } from '../../config/constants';
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

function withTax(subtotal: number) {
  const taxAmount = roundCurrency(subtotal * (TAX_RATE / 100));
  return { taxRate: TAX_RATE, taxAmount, totalWithTax: roundCurrency(subtotal + taxAmount) };
}

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
    const grandTotal = roundCurrency(laborTotal + partsTotal + otherCostsTotal);

    return {
      labor: { items: laborItems, total: laborTotal },
      parts: { items: parts, total: partsTotal },
      otherCosts: { items: otherCosts, total: otherCostsTotal },
      grandTotal,
      ...withTax(grandTotal),
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

  async requestEstimateApproval(id: string) {
    const entry = await entriesRepository.findById(id);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }
    if (entry.estimateStatus === 'PENDING_APPROVAL') {
      throw ApiError.badRequest('Estimate approval is already pending.');
    }

    const estimate = await entriesService.getEstimate(id);

    // "Pending" = not yet approved. On a fresh estimate every item is
    // pending, so this reduces to the whole estimate. After a prior
    // approval, only items added since then (approvedAt still null) are
    // pending — the client only ever gets asked to approve what's new,
    // never re-shown a total that includes what they already accepted.
    const pendingLabor = estimate.labor.items.filter((item) => !item.approvedAt);
    const pendingParts = estimate.parts.items.filter((item) => !item.approvedAt);
    const pendingOtherCosts = estimate.otherCosts.items.filter((item) => !item.approvedAt);
    const pendingTotal = roundCurrency(
      pendingLabor.reduce((sum, item) => sum + Number(item.total), 0) +
        pendingParts.reduce((sum, item) => sum + Number(item.total), 0) +
        pendingOtherCosts.reduce((sum, item) => sum + Number(item.amount), 0),
    );

    if (pendingTotal <= 0) {
      throw ApiError.badRequest('There are no new billable items to request approval for.');
    }

    const pendingTax = withTax(pendingTotal);

    const isAdditional =
      estimate.labor.items.some((item) => item.approvedAt) ||
      estimate.parts.items.some((item) => item.approvedAt) ||
      estimate.otherCosts.items.some((item) => item.approvedAt);

    const updated = await entriesRepository.update(id, { estimateStatus: 'PENDING_APPROVAL' });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: id,
      eventType: 'NOTE_ADDED',
      description: isAdditional
        ? `Additional cost sent to client for approval (total €${pendingTax.totalWithTax}, IVA included).`
        : `Estimate sent to client for approval (total €${pendingTax.totalWithTax}, IVA included).`,
    });

    await notificationsService.notifyEstimatePendingApproval(id, {
      labor: pendingLabor,
      parts: pendingParts,
      otherCosts: pendingOtherCosts,
      subtotal: pendingTotal,
      ...pendingTax,
      isAdditional,
    });

    return updated;
  },
};
