import { z } from 'zod';

export const createOtherCostSchema = z.object({
  description: z.string().min(1, 'description is required.'),
  amount: z.coerce.number().positive('amount must be greater than 0.'),
  category: z.string().optional(),
});

export const updateOtherCostSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  category: z.string().nullable().optional(),
});

export type CreateOtherCostInput = z.infer<typeof createOtherCostSchema>;
export type UpdateOtherCostInput = z.infer<typeof updateOtherCostSchema>;
