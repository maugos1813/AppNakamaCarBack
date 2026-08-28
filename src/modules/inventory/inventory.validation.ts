import { z } from 'zod';

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'name is required.'),
  unit: z.string().min(1, 'unit is required.'),
  quantity: z.coerce.number().min(0).default(0),
  minQuantity: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  quantity: z.coerce.number().min(0).optional(),
  minQuantity: z.coerce.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
