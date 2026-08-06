import { ApiError } from '../../utils/ApiError';
import { entriesRepository } from '../entries/entries.repository';
import { damagesRepository } from './damages.repository';
import type { CreateDamageInput, UpdateDamageInput } from './damages.validation';

async function assertEntryExists(vehicleEntryId: string) {
  const entry = await entriesRepository.findById(vehicleEntryId);
  if (!entry) {
    throw ApiError.notFound('Vehicle entry not found.');
  }
}

export const damagesService = {
  async listByEntry(vehicleEntryId: string) {
    await assertEntryExists(vehicleEntryId);
    return damagesRepository.findByEntryId(vehicleEntryId);
  },

  async createDamage(vehicleEntryId: string, input: CreateDamageInput) {
    await assertEntryExists(vehicleEntryId);
    return damagesRepository.create({ ...input, vehicleEntryId });
  },

  async updateDamage(id: string, input: UpdateDamageInput) {
    const existing = await damagesRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Damage not found.');
    }
    return damagesRepository.update(id, input);
  },

  async deleteDamage(id: string) {
    const existing = await damagesRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Damage not found.');
    }
    await damagesRepository.delete(id);
  },
};
