import { ApiError } from '../../utils/ApiError';
import { entriesRepository } from '../entries/entries.repository';
import { clientPortalService } from '../clientPortal/clientPortal.service';
import type { RejectEstimateInput } from '../clientPortal/clientPortal.validation';

interface Pagination {
  page: number;
  pageSize: number;
}

// The one check every method here needs before delegating to
// clientPortalService: that the entry actually belongs to a vehicle owned
// by the logged-in client. 404 rather than 403 so a premium client can't
// even tell whether an entryId belonging to someone else exists.
async function assertOwnership(entryId: string, clientId: string) {
  const entry = await entriesRepository.findById(entryId);
  if (!entry || entry.vehicle.clientId !== clientId) {
    throw ApiError.notFound('Vehicle entry not found.');
  }
}

export const clientFleetService = {
  async listVehicleEntries(clientId: string, pagination: Pagination) {
    const { items, total } = await entriesRepository.findMany({ clientId }, pagination);
    return {
      items: items.map((entry) => ({
        id: entry.id,
        vehicle: {
          licensePlate: entry.vehicle.licensePlate,
          make: entry.vehicle.make,
          model: entry.vehicle.model,
        },
        status: entry.status,
        estimateStatus: entry.estimateStatus,
        entryDate: entry.entryDate,
        estimatedCompletionDate: entry.estimatedCompletionDate,
      })),
      pagination: { ...pagination, total },
    };
  },

  async getEntrySummary(clientId: string, entryId: string) {
    await assertOwnership(entryId, clientId);
    return clientPortalService.getSummary(entryId);
  },

  async approveEstimate(clientId: string, entryId: string) {
    await assertOwnership(entryId, clientId);
    return clientPortalService.approveEstimate(entryId);
  },

  async rejectEstimate(clientId: string, entryId: string, input: RejectEstimateInput) {
    await assertOwnership(entryId, clientId);
    return clientPortalService.rejectEstimate(entryId, input);
  },

  async getInvoicePdf(clientId: string, entryId: string) {
    await assertOwnership(entryId, clientId);
    return clientPortalService.getInvoicePdf(entryId);
  },

  async uploadPaymentReceipt(clientId: string, entryId: string, file: Express.Multer.File) {
    await assertOwnership(entryId, clientId);
    return clientPortalService.uploadPaymentReceipt(entryId, file);
  },

  async requestOfficePayment(clientId: string, entryId: string) {
    await assertOwnership(entryId, clientId);
    return clientPortalService.requestOfficePayment(entryId);
  },
};
