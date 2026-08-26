import { ApiError } from '../../utils/ApiError';
import { buildClientPortalSetupUrl } from '../../lib/clientSessionToken';
import { sendEmail } from '../../lib/email';
import { logger } from '../../lib/logger';
import { buildEmailHtml } from '../notifications/notifications.service';
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

  async enablePortalAccess(id: string) {
    const client = await clientsRepository.findById(id);
    if (!client) {
      throw ApiError.notFound('Client not found.');
    }
    if (!client.email) {
      throw ApiError.badRequest('Client must have an email before enabling portal access.');
    }

    // Email only needs to be unique among OTHER portal-enabled clients —
    // plenty of ordinary (non-premium) clients share a blank or duplicate
    // email, and that's fine since they never log in with it.
    const existingWithEmail = await clientsRepository.findByEmail(client.email);
    if (existingWithEmail && existingWithEmail.id !== id && existingWithEmail.portalEnabled) {
      throw ApiError.conflict('Another premium client account already uses this email.');
    }

    const updated = await clientsRepository.update(id, { portalEnabled: true });

    const setupUrl = buildClientPortalSetupUrl(id);
    try {
      await sendEmail(
        client.email,
        'Attiva il tuo account NakamaCar',
        buildEmailHtml(
          'Attiva il tuo account',
          `Ciao ${client.fullName}, ora puoi accedere al portale clienti per seguire tutti i tuoi veicoli in un unico posto. Il link scade tra 48 ore.`,
          { url: setupUrl, label: 'Attiva account' },
        ),
      );
    } catch (err) {
      logger.error({ err }, 'Failed to send client portal activation email.');
    }

    return updated;
  },
};
