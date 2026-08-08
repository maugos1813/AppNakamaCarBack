import { ApiError } from '../../utils/ApiError';
import { entriesRepository } from '../entries/entries.repository';
import { entriesService } from '../entries/entries.service';
import { repairsRepository } from '../repairs/repairs.repository';
import { photosRepository } from '../photos/photos.repository';
import { invoicesRepository } from '../invoices/invoices.repository';
import { invoicesService } from '../invoices/invoices.service';
import type { RejectEstimateInput } from './clientPortal.validation';

async function loadEntry(entryId: string) {
  const entry = await entriesRepository.findById(entryId);
  if (!entry) {
    throw ApiError.notFound('Vehicle entry not found.');
  }
  return entry;
}

export const clientPortalService = {
  async getSummary(entryId: string) {
    const entry = await loadEntry(entryId);

    const [stages, photos, estimate, invoice] = await Promise.all([
      repairsRepository.findByEntryId(entryId),
      photosRepository.findByEntryId(entryId),
      entriesService.getEstimate(entryId),
      invoicesRepository.findByVehicleEntryId(entryId),
    ]);

    return {
      vehicle: {
        licensePlate: entry.vehicle.licensePlate,
        make: entry.vehicle.make,
        model: entry.vehicle.model,
      },
      status: entry.status,
      estimateStatus: entry.estimateStatus,
      entryDate: entry.entryDate,
      estimatedCompletionDate: entry.estimatedCompletionDate,
      stages: stages.map((s) => ({ stage: s.stage, status: s.status, order: s.order })),
      photos: photos.map((p) => ({ url: p.url, category: p.category, caption: p.caption, createdAt: p.createdAt })),
      estimate,
      invoice: invoice ? { id: invoice.id, status: invoice.status, invoiceNumber: invoice.invoiceNumber } : null,
    };
  },

  async approveEstimate(entryId: string) {
    const entry = await loadEntry(entryId);
    if (entry.estimateStatus !== 'PENDING_APPROVAL') {
      throw ApiError.badRequest(`Estimate cannot be approved from status ${entry.estimateStatus}.`);
    }

    const updated = await entriesRepository.update(entryId, {
      estimateStatus: 'APPROVED',
      estimateRespondedAt: new Date(),
    });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: entryId,
      eventType: 'ESTIMATE_APPROVED',
      description: 'Client approved the repair estimate.',
    });

    return updated;
  },

  async rejectEstimate(entryId: string, input: RejectEstimateInput) {
    const entry = await loadEntry(entryId);
    if (entry.estimateStatus !== 'PENDING_APPROVAL') {
      throw ApiError.badRequest(`Estimate cannot be rejected from status ${entry.estimateStatus}.`);
    }

    const updated = await entriesRepository.update(entryId, {
      estimateStatus: 'REJECTED',
      estimateRespondedAt: new Date(),
    });

    await entriesRepository.createHistoryEvent({
      vehicleEntryId: entryId,
      eventType: 'ESTIMATE_REJECTED',
      description: `Client rejected the repair estimate.${input.reason ? ` Reason: ${input.reason}` : ''}`,
    });

    return updated;
  },

  async getInvoicePdf(entryId: string) {
    await loadEntry(entryId);
    const invoice = await invoicesRepository.findByVehicleEntryId(entryId);
    if (!invoice) {
      throw ApiError.notFound('No invoice exists for this vehicle entry yet.');
    }
    return invoicesService.getInvoicePdf(invoice.id);
  },
};
