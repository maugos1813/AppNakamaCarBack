import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/ApiResponse';
import { inventoryService } from './inventory.service';
import { createInventoryItemSchema, updateInventoryItemSchema } from './inventory.validation';

export const inventoryController = {
  async list(_req: Request, res: Response) {
    const items = await inventoryService.listItems();
    sendSuccess(res, { message: 'Inventory items retrieved successfully.', data: items });
  },

  async create(req: Request, res: Response) {
    const input = createInventoryItemSchema.parse(req.body);
    const item = await inventoryService.createItem(input);
    sendSuccess(res, { statusCode: 201, message: 'Inventory item created successfully.', data: item });
  },

  async update(req: Request, res: Response) {
    const input = updateInventoryItemSchema.parse(req.body);
    const item = await inventoryService.updateItem(req.params.id as string, input);
    sendSuccess(res, { message: 'Inventory item updated successfully.', data: item });
  },

  async remove(req: Request, res: Response) {
    await inventoryService.deleteItem(req.params.id as string);
    sendSuccess(res, { message: 'Inventory item deleted successfully.' });
  },
};
