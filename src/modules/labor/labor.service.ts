import { ApiError } from '../../utils/ApiError';
import { roundCurrency } from '../../utils/money';
import { entriesRepository } from '../entries/entries.repository';
import { laborRepository } from './labor.repository';
import type { CreateLaborItemInput, UpdateLaborItemInput } from './labor.validation';

async function assertEntryExists(vehicleEntryId: string) {
  const entry = await entriesRepository.findById(vehicleEntryId);
  if (!entry) {
    throw ApiError.notFound('Vehicle entry not found.');
  }
}

export const laborService = {
  async listByEntry(vehicleEntryId: string) {
    await assertEntryExists(vehicleEntryId);
    return laborRepository.findByEntryId(vehicleEntryId);
  },

  async createLaborItem(vehicleEntryId: string, input: CreateLaborItemInput) {
    await assertEntryExists(vehicleEntryId);

    return laborRepository.create({
      vehicleEntryId,
      description: input.description,
      hours: input.hours,
      hourlyRate: input.hourlyRate,
      total: roundCurrency(input.hours * input.hourlyRate),
      status: input.status,
    });
  },

  async updateLaborItem(id: string, input: UpdateLaborItemInput) {
    const existing = await laborRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Labor item not found.');
    }

    const hours = input.hours ?? Number(existing.hours);
    const hourlyRate = input.hourlyRate ?? Number(existing.hourlyRate);

    return laborRepository.update(id, {
      ...input,
      total: roundCurrency(hours * hourlyRate),
    });
  },

  async deleteLaborItem(id: string) {
    const existing = await laborRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Labor item not found.');
    }
    await laborRepository.delete(id);
  },
};
