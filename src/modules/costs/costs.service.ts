import { ApiError } from '../../utils/ApiError';
import { entriesRepository } from '../entries/entries.repository';
import { costsRepository } from './costs.repository';
import type { CreateOtherCostInput, UpdateOtherCostInput } from './costs.validation';

async function assertEntryExists(vehicleEntryId: string) {
  const entry = await entriesRepository.findById(vehicleEntryId);
  if (!entry) {
    throw ApiError.notFound('Vehicle entry not found.');
  }
}

export const costsService = {
  async listByEntry(vehicleEntryId: string) {
    await assertEntryExists(vehicleEntryId);
    return costsRepository.findByEntryId(vehicleEntryId);
  },

  async createCost(vehicleEntryId: string, input: CreateOtherCostInput) {
    await assertEntryExists(vehicleEntryId);
    return costsRepository.create({ ...input, vehicleEntryId });
  },

  async updateCost(id: string, input: UpdateOtherCostInput) {
    const existing = await costsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Other cost not found.');
    }
    return costsRepository.update(id, input);
  },

  async deleteCost(id: string) {
    const existing = await costsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Other cost not found.');
    }
    await costsRepository.delete(id);
  },
};
