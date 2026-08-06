import { ApiError } from '../../utils/ApiError';
import { clientsRepository } from './clients.repository';
import type { CreateClientInput, ListClientsQuery, UpdateClientInput } from './clients.validation';

export const clientsService = {
  async listClients(query: ListClientsQuery) {
    const { items, total } = await clientsRepository.findMany(
      { search: query.search, isCompany: query.isCompany },
      { page: query.page, pageSize: query.pageSize },
    );

    return { items, pagination: { page: query.page, pageSize: query.pageSize, total } };
  },

  async getClientById(id: string) {
    const client = await clientsRepository.findById(id);
    if (!client) {
      throw ApiError.notFound('Client not found.');
    }
    return client;
  },

  createClient(input: CreateClientInput) {
    return clientsRepository.create(input);
  },

  async updateClient(id: string, input: UpdateClientInput) {
    const existing = await clientsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Client not found.');
    }
    return clientsRepository.update(id, input);
  },

  async deleteClient(id: string) {
    const existing = await clientsRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Client not found.');
    }
    await clientsRepository.delete(id);
  },
};
