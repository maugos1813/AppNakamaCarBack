import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { clientsService } from './clients.service';
import { createClientSchema, listClientsQuerySchema, updateClientSchema } from './clients.validation';

export const clientsController = {
  async list(req: Request, res: Response) {
    const query = listClientsQuerySchema.parse(req.query);
    const result = await clientsService.listClients(query);
    sendSuccess(res, { message: 'Clients retrieved successfully.', data: result });
  },

  async getById(req: Request, res: Response) {
    const client = await clientsService.getClientById(req.params.id as string);
    sendSuccess(res, { message: 'Client retrieved successfully.', data: client });
  },

  async create(req: Request, res: Response) {
    const input = createClientSchema.parse(req.body);
    const client = await clientsService.createClient(input);
    sendSuccess(res, { statusCode: 201, message: 'Client created successfully.', data: client });
  },

  async update(req: Request, res: Response) {
    const input = updateClientSchema.parse(req.body);
    const client = await clientsService.updateClient(req.params.id as string, input);
    sendSuccess(res, { message: 'Client updated successfully.', data: client });
  },

  async remove(req: Request, res: Response) {
    await clientsService.deleteClient(req.params.id as string);
    sendSuccess(res, { message: 'Client deleted successfully.' });
  },
};
