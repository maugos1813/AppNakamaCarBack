import { ApiError } from '../../utils/ApiError';
import { roundCurrency } from '../../utils/money';
import { entriesRepository } from '../entries/entries.repository';
import { partsRepository } from './parts.repository';
import type { CreatePartInput, UpdatePartInput } from './parts.validation';

async function assertEntryExists(vehicleEntryId: string) {
  const entry = await entriesRepository.findById(vehicleEntryId);
  if (!entry) {
    throw ApiError.notFound('Vehicle entry not found.');
  }
}

export const partsService = {
  async listByEntry(vehicleEntryId: string) {
    await assertEntryExists(vehicleEntryId);
    return partsRepository.findByEntryId(vehicleEntryId);
  },

  async createPart(vehicleEntryId: string, input: CreatePartInput) {
    await assertEntryExists(vehicleEntryId);

    return partsRepository.create({
      vehicleEntryId,
      name: input.name,
      partNumber: input.partNumber,
      supplier: input.supplier,
      quantity: input.quantity,
      unitCost: input.unitCost,
      unitPrice: input.unitPrice,
      total: roundCurrency(input.quantity * input.unitPrice),
      status: input.status,
    });
  },

  async updatePart(id: string, input: UpdatePartInput) {
    const existing = await partsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Part not found.');
    }

    const quantity = input.quantity ?? existing.quantity;
    const unitPrice = input.unitPrice ?? Number(existing.unitPrice);

    return partsRepository.update(id, {
      ...input,
      total: roundCurrency(quantity * unitPrice),
    });
  },

  async deletePart(id: string) {
    const existing = await partsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Part not found.');
    }
    await partsRepository.delete(id);
  },
};
