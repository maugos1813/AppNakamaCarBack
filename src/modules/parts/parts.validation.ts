import { z } from 'zod';

const statusSchema = z.enum(['PENDING_ORDER', 'ORDERED', 'RECEIVED', 'INSTALLED']);

export const createPartSchema = z.object({
  name: z.string().min(1, 'name is required.'),
  partNumber: z.string().optional(),
  supplier: z.string().optional(),
  quantity: z.coerce.number().int().positive().default(1),
  unitCost: z.coerce.number().nonnegative('unitCost cannot be negative.'),
  unitPrice: z.coerce.number().nonnegative('unitPrice cannot be negative.'),
  status: statusSchema.optional(),
});

export const updatePartSchema = z.object({
  name: z.string().min(1).optional(),
  partNumber: z.string().nullable().optional(),
  supplier: z.string().nullable().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  unitCost: z.coerce.number().nonnegative().optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  status: statusSchema.optional(),
});

export type CreatePartInput = z.infer<typeof createPartSchema>;
export type UpdatePartInput = z.infer<typeof updatePartSchema>;
