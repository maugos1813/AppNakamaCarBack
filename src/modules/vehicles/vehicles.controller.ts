import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { vehiclesService } from './vehicles.service';
import { createVehicleSchema, listVehiclesQuerySchema, updateVehicleSchema } from './vehicles.validation';

export const vehiclesController = {
  async list(req: Request, res: Response) {
    const query = listVehiclesQuerySchema.parse(req.query);
    const result = await vehiclesService.listVehicles(query);
    sendSuccess(res, { message: 'Vehicles retrieved successfully.', data: result });
  },

  async getById(req: Request, res: Response) {
    const vehicle = await vehiclesService.getVehicleById(req.params.id as string);
    sendSuccess(res, { message: 'Vehicle retrieved successfully.', data: vehicle });
  },

  async create(req: Request, res: Response) {
    const input = createVehicleSchema.parse(req.body);
    const vehicle = await vehiclesService.createVehicle(input);
    sendSuccess(res, { statusCode: 201, message: 'Vehicle created successfully.', data: vehicle });
  },

  async update(req: Request, res: Response) {
    const input = updateVehicleSchema.parse(req.body);
    const vehicle = await vehiclesService.updateVehicle(req.params.id as string, input);
    sendSuccess(res, { message: 'Vehicle updated successfully.', data: vehicle });
  },

  async remove(req: Request, res: Response) {
    await vehiclesService.deleteVehicle(req.params.id as string);
    sendSuccess(res, { message: 'Vehicle deleted successfully.' });
  },
};
