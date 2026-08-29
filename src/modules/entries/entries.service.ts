import { randomUUID } from 'node:crypto';
import type { VehicleEntryStatus } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { roundCurrency } from '../../utils/money';
import { TAX_RATE } from '../../config/constants';
import { logger } from '../../lib/logger';
import { deleteFromR2, uploadToR2 } from '../../lib/r2';
import { vehiclesRepository } from '../vehicles/vehicles.repository';
import { laborRepository } from '../labor/labor.repository';
import { partsRepository } from '../parts/parts.repository';
import { costsRepository } from '../costs/costs.repository';
import { photosRepository } from '../photos/photos.repository';
import { invoicesRepository } from '../invoices/invoices.repository';
import { repairsService } from '../repairs/repairs.service';
import { notificationsService } from '../notifications/notifications.service';
import { entriesRepository } from './entries.repository';
import type {
  CaptureSignatureInput,
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
      {
        vehicleId: query.vehicleId,
        clientId: query.clientId,
        status: query.status,
        search: query.search,
        from: query.from,
        to: query.to,
      },
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

  // Full, permanent delete — including its invoice and any payments already
  // recorded against it, unlike cancelInvoice which refuses once money has
  // changed hands. Admin-only and meant for wiping out test data, not a
  // routine action once the shop is handling real jobs.
  async deleteEntry(id: string) {
    const entry = await entriesRepository.findById(id);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }

    const [photos, invoice] = await Promise.all([
      photosRepository.findByEntryId(id),
      entry.invoice ? invoicesRepository.findById(entry.invoice.id) : null,
    ]);

    await entriesRepository.transaction(async (tx) => {
      if (invoice) {
        await tx.payment.deleteMany({ where: { invoiceId: invoice.id } });
        await tx.invoice.delete({ where: { id: invoice.id } });
      }
      await tx.vehicleEntry.delete({ where: { id } });
    });

    // Best-effort — the database rows are already gone regardless of
    // whether these R2 objects actually get cleaned up.
    const storageKeys = [...photos.map((p) => p.storageKey), ...(invoice?.receipts.map((r) => r.storageKey) ?? [])];
    await Promise.all(
      storageKeys.map((key) =>
        deleteFromR2(key).catch((err) => logger.error({ err, key }, 'Failed to delete R2 object during entry deletion')),
      ),
    );
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

    // "Listo para retirar" is a claim the shop is actually done — a stage
    // left PENDING/IN_PROGRESS means the car isn't. SKIPPED counts as
    // resolved (a stage that legitimately didn't apply to this job).
    if (input.status === 'COMPLETED') {
      const unfinished = existing.stages.filter((stage) => stage.status !== 'DONE' && stage.status !== 'SKIPPED');
      if (unfinished.length > 0) {
        throw ApiError.badRequest(
          `Cannot mark as ready for pickup — ${unfinished.length} repair stage(s) are still pending.`,
        );
      }
    }

    // A vehicle only ever has an invoice once it's actually being billed —
    // if there isn't one, there's nothing to collect (e.g. warranty work),
    // so only block delivery when an invoice exists and isn't PAID yet.
    if (input.status === 'DELIVERED' && existing.invoice && existing.invoice.status !== 'PAID') {
      throw ApiError.badRequest('Cannot mark as delivered — the invoice has not been paid yet.');
    }

    // Recorded on the way in, cleared on the way back out (reopening to
    // IN_PROGRESS) — completedAt/completedByUserId should only ever reflect
    // the current, still-standing completion, for reporting and reminders.
    const completionFields =
      input.status === 'COMPLETED'
        ? { completedAt: new Date(), completedByUserId: performedByUserId }
        : input.status === 'IN_PROGRESS' && existing.status === 'COMPLETED'
          ? { completedAt: null, completedByUserId: null }
          : {};

    const updated = await entriesRepository.update(id, { status: input.status, ...completionFields });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: id,
      eventType: 'STATUS_CHANGED',
      description: `Status changed from ${existing.status} to ${input.status}.${input.notes ? ` ${input.notes}` : ''}`,
      performedByUserId,
    });

    await notificationsService.notifyEntryStatusChange(id, input.status);

    return updated;
  },

  // In-person sign-off captured on a staff device (signature pad) at
  // intake or at hand-over — kept as an optional backup record, not a
  // requirement to proceed. Delivery is admin-only, matching who's allowed
  // to mark the entry DELIVERED in the first place.
  async captureSignature(id: string, input: CaptureSignatureInput, actingUser: { role: string }) {
    if (input.type === 'DELIVERY' && actingUser.role !== 'ADMIN') {
      throw ApiError.forbidden('Only an admin can capture the delivery signature.');
    }

    const entry = await entriesRepository.findById(id);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }

    const match = input.imageDataUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
    if (!match || !match[1] || !match[2]) {
      throw ApiError.badRequest('imageDataUrl must be a base64 PNG/JPEG/WEBP data URL.');
    }
    const extension = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const storageKey = `entries/${id}/signatures/${input.type.toLowerCase()}-${randomUUID()}.${extension}`;
    const url = await uploadToR2(storageKey, buffer, `image/${extension}`);

    const now = new Date();
    const data =
      input.type === 'INTAKE'
        ? { intakeSignatureUrl: url, intakeSignedAt: now, intakeSignedByName: input.signerName }
        : { deliverySignatureUrl: url, deliverySignedAt: now, deliverySignedByName: input.signerName };

    const updated = await entriesRepository.update(id, data);

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: id,
      eventType: 'NOTE_ADDED',
      description: `${input.type === 'INTAKE' ? 'Intake' : 'Delivery'} signature captured, signed by ${input.signerName}.`,
    });

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
