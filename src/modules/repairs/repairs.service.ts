import type { Prisma, RepairStageStatus } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { entriesRepository } from '../entries/entries.repository';
import { usersRepository } from '../users/users.repository';
import { repairsRepository } from './repairs.repository';
import type { UpdateStageInput } from './repairs.validation';

const ALLOWED_TRANSITIONS: Record<RepairStageStatus, RepairStageStatus[]> = {
  PENDING: ['IN_PROGRESS', 'SKIPPED'],
  IN_PROGRESS: ['DONE', 'SKIPPED'],
  DONE: ['IN_PROGRESS'],
  SKIPPED: ['PENDING', 'IN_PROGRESS'],
};

export const repairsService = {
  createDefaultStages(vehicleEntryId: string) {
    return repairsRepository.createDefaultStages(vehicleEntryId);
  },

  async listByEntry(vehicleEntryId: string) {
    const entry = await entriesRepository.findById(vehicleEntryId);
    if (!entry) {
      throw ApiError.notFound('Vehicle entry not found.');
    }
    return repairsRepository.findByEntryId(vehicleEntryId);
  },

  async updateStage(id: string, input: UpdateStageInput, performedByUserId: string) {
    const existing = await repairsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Repair stage not found.');
    }

    if (input.assignedMechanicId) {
      const mechanic = await usersRepository.findById(input.assignedMechanicId);
      if (!mechanic) {
        throw ApiError.badRequest('assignedMechanicId does not match an existing user.');
      }
    }

    const data: Prisma.RepairStageUncheckedUpdateInput = {
      assignedMechanicId: input.assignedMechanicId,
      notes: input.notes,
    };

    if (input.status && input.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status];
      if (!allowed.includes(input.status)) {
        throw ApiError.badRequest(`Cannot change stage status from ${existing.status} to ${input.status}.`);
      }

      data.status = input.status;
      if (input.status === 'IN_PROGRESS' && !existing.startedAt) {
        data.startedAt = new Date();
      }
      if (input.status === 'DONE') {
        data.completedAt = new Date();
      }
    }

    const updated = await repairsRepository.update(id, data);

    if (input.status && input.status !== existing.status) {
      await entriesRepository.createHistoryEvent({
        vehicleEntryId: existing.vehicleEntryId,
        eventType: 'STAGE_CHANGED',
        description: `Stage ${existing.stage} changed from ${existing.status} to ${input.status}.`,
        performedByUserId,
      });
    }

    return updated;
  },
};
