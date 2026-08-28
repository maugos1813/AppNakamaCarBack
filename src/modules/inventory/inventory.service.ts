import { ApiError } from '../../utils/ApiError';
import { notificationsService } from '../notifications/notifications.service';
import { inventoryRepository, type InventoryItemRecord } from './inventory.repository';
import type { CreateInventoryItemInput, UpdateInventoryItemInput } from './inventory.validation';

function isLowStock(item: Pick<InventoryItemRecord, 'quantity' | 'minQuantity'>): boolean {
  return item.minQuantity !== null && Number(item.quantity) <= Number(item.minQuantity);
}

export const inventoryService = {
  listItems() {
    return inventoryRepository.findMany();
  },

  async createItem(input: CreateInventoryItemInput) {
    const item = await inventoryRepository.create(input);
    if (isLowStock(item)) {
      await notificationsService.notifyAdminsLowStock({ name: item.name, quantity: String(item.quantity), unit: item.unit });
    }
    return item;
  },

  async updateItem(id: string, input: UpdateInventoryItemInput) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Inventory item not found.');
    }
    const updated = await inventoryRepository.update(id, input);

    // Only notify on the transition INTO low stock, not every edit while it
    // stays low — otherwise routine small adjustments would re-alert on
    // every save.
    if (isLowStock(updated) && !isLowStock(existing)) {
      await notificationsService.notifyAdminsLowStock({
        name: updated.name,
        quantity: String(updated.quantity),
        unit: updated.unit,
      });
    }

    return updated;
  },

  async deleteItem(id: string) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('Inventory item not found.');
    }
    await inventoryRepository.delete(id);
  },
};
