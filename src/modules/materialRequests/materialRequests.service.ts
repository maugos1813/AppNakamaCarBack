import { ApiError } from '../../utils/ApiError';
import { materialRequestsRepository } from './materialRequests.repository';
import type {
  CreateMaterialRequestInput,
  ListMaterialRequestsQuery,
  SetMaterialRequestStatusInput,
} from './materialRequests.validation';

// A mechanic can withdraw their own ask while it's still PENDING; once an
// admin has approved or rejected it, only the admin touches it further.
function assertCanDelete(
  item: { createdByUserId: string | null; status: string },
  actingUser: { id: string; role: string },
) {
  if (actingUser.role === 'ADMIN') return;
  if (item.createdByUserId !== actingUser.id) {
    throw ApiError.forbidden('You can only delete your own material requests.');
  }
  if (item.status !== 'PENDING') {
    throw ApiError.badRequest('This request has already been reviewed and can no longer be deleted.');
  }
}

export const materialRequestsService = {
  async listAll(query: ListMaterialRequestsQuery) {
    const { items, total } = await materialRequestsRepository.findMany(
      { status: query.status },
      { page: query.page, pageSize: query.pageSize },
    );
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total } };
  },

  createRequest(input: CreateMaterialRequestInput, createdByUserId: string) {
    return materialRequestsRepository.create({ ...input, createdByUserId });
  },

  async setStatus(id: string, input: SetMaterialRequestStatusInput) {
    const existing = await materialRequestsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Material request not found.');
    }
    return materialRequestsRepository.update(id, { status: input.status });
  },

  async deleteRequest(id: string, actingUser: { id: string; role: string }) {
    const existing = await materialRequestsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Material request not found.');
    }
    assertCanDelete(existing, actingUser);
    await materialRequestsRepository.delete(id);
  },
};
