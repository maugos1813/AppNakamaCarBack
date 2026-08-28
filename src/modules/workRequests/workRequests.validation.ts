import { z } from 'zod';

export const createWorkRequestSchema = z.object({
  description: z.string().min(1, 'description is required.'),
});

export const updateWorkRequestSchema = z.object({
  description: z.string().min(1, 'description is required.'),
});

export const setWorkRequestStatusSchema = z.object({
  status: z.enum(['PENDING', 'PRICED', 'DISMISSED']),
});

export const listWorkRequestsQuerySchema = z.object({
  status: z.enum(['PENDING', 'PRICED', 'DISMISSED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateWorkRequestInput = z.infer<typeof createWorkRequestSchema>;
export type UpdateWorkRequestInput = z.infer<typeof updateWorkRequestSchema>;
export type SetWorkRequestStatusInput = z.infer<typeof setWorkRequestStatusSchema>;
export type ListWorkRequestsQuery = z.infer<typeof listWorkRequestsQuerySchema>;
