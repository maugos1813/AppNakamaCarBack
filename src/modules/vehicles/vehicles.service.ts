import { ApiError } from '../../utils/ApiError';
import { clientsRepository } from '../clients/clients.repository';
import { vehiclesRepository } from './vehicles.repository';
import type { CreateVehicleInput, ListVehiclesQuery, UpdateVehicleInput } from './vehicles.validation';

async function assertClientExists(clientId: string) {
  const client = await clientsRepository.findById(clientId);
  if (!client) {
    throw ApiError.badRequest('clientId does not match an existing client.');
  }
}

export const vehiclesService = {
  async listVehicles(query: ListVehiclesQuery) {
    const { items, total } = await vehiclesRepository.findMany(
      { clientId: query.clientId, search: query.search },
      { page: query.page, pageSize: query.pageSize },
    );

    return { items, pagination: { page: query.page, pageSize: query.pageSize, total } };
  },

  async getVehicleById(id: string) {
    const vehicle = await vehiclesRepository.findById(id);
    if (!vehicle) {
      throw ApiError.notFound('Vehicle not found.');
    }
    return vehicle;
  },

  async createVehicle(input: CreateVehicleInput) {
    await assertClientExists(input.clientId);
    return vehiclesRepository.create(input);
  },

  async updateVehicle(id: string, input: UpdateVehicleInput) {
    const existing = await vehiclesRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Vehicle not found.');
    }
    if (input.clientId) {
      await assertClientExists(input.clientId);
    }
    return vehiclesRepository.update(id, input);
  },

  async deleteVehicle(id: string) {
    const existing = await vehiclesRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Vehicle not found.');
    }
    await vehiclesRepository.delete(id);
  },
};
