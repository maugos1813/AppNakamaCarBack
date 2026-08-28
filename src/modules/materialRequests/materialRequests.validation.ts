import { z } from 'zod';

export const createMaterialRequestSchema = z.object({
  description: z.string().min(1, 'description is required.'),
  quantity: z.coerce.number().int().positive().default(1),
});

export const setMaterialRequestStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
});

export const listMaterialRequestsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateMaterialRequestInput = z.infer<typeof createMaterialRequestSchema>;
export type SetMaterialRequestStatusInput = z.infer<typeof setMaterialRequestStatusSchema>;
export type ListMaterialRequestsQuery = z.infer<typeof listMaterialRequestsQuerySchema>;
