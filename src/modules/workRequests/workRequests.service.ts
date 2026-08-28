import { ApiError } from '../../utils/ApiError';
import { entriesRepository } from '../entries/entries.repository';
import { notificationsService } from '../notifications/notifications.service';
import { workRequestsRepository } from './workRequests.repository';
import type {
  CreateWorkRequestInput,
  ListWorkRequestsQuery,
  SetWorkRequestStatusInput,
  UpdateWorkRequestInput,
} from './workRequests.validation';

async function assertEntryExists(vehicleEntryId: string) {
  const entry = await entriesRepository.findById(vehicleEntryId);
  if (!entry) {
    throw ApiError.notFound('Vehicle entry not found.');
  }
  return entry;
}

// A mechanic can only fix a typo on their own request before an admin has
// acted on it — once it's PRICED or DISMISSED, only an admin touches it.
function assertCanModify(
  item: { createdByUserId: string | null; status: string },
  actingUser: { id: string; role: string },
) {
  if (actingUser.role === 'ADMIN') return;
  if (item.createdByUserId !== actingUser.id) {
    throw ApiError.forbidden('You can only modify your own work requests.');
  }
  if (item.status !== 'PENDING') {
    throw ApiError.badRequest('This request has already been reviewed and can no longer be edited.');
  }
}

export const workRequestsService = {
  async listByEntry(vehicleEntryId: string) {
    await assertEntryExists(vehicleEntryId);
    return workRequestsRepository.findByEntryId(vehicleEntryId);
  },

  async listAll(query: ListWorkRequestsQuery) {
    const { items, total } = await workRequestsRepository.findMany(
      { status: query.status },
      { page: query.page, pageSize: query.pageSize },
    );
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total } };
  },

  async createWorkRequest(
    vehicleEntryId: string,
    input: CreateWorkRequestInput,
    createdByUserId: string,
    createdByName: string,
  ) {
    const entry = await assertEntryExists(vehicleEntryId);
    const item = await workRequestsRepository.create({ ...input, vehicleEntryId, createdByUserId });

    await notificationsService.notifyAdminsNewWorkRequest({
      vehicleEntryId,
      licensePlate: entry.vehicle.licensePlate,
      description: input.description,
      createdByName,
    });

    return item;
  },

  async updateWorkRequest(id: string, input: UpdateWorkRequestInput, actingUser: { id: string; role: string }) {
    const existing = await workRequestsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Work request not found.');
    }
    assertCanModify(existing, actingUser);
    return workRequestsRepository.update(id, input);
  },

  // Deliberately separate from updateWorkRequest — changing status is an
  // admin-only decision (see the route's authorize('ADMIN')), independent
  // of who's allowed to edit the description.
  async setStatus(id: string, input: SetWorkRequestStatusInput) {
    const existing = await workRequestsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Work request not found.');
    }
    return workRequestsRepository.update(id, { status: input.status });
  },

  async deleteWorkRequest(id: string, actingUser: { id: string; role: string }) {
    const existing = await workRequestsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Work request not found.');
    }
    assertCanModify(existing, actingUser);
    await workRequestsRepository.delete(id);
  },
};
