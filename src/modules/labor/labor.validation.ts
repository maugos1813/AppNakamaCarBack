import { z } from 'zod';

const statusSchema = z.enum(['PENDING', 'APPROVED', 'COMPLETED']);

export const createLaborItemSchema = z.object({
  description: z.string().min(1, 'description is required.'),
  hours: z.coerce.number().positive('hours must be greater than 0.'),
  hourlyRate: z.coerce.number().positive('hourlyRate must be greater than 0.'),
  status: statusSchema.optional(),
});

export const updateLaborItemSchema = z.object({
  description: z.string().min(1).optional(),
  hours: z.coerce.number().positive().optional(),
  hourlyRate: z.coerce.number().positive().optional(),
  status: statusSchema.optional(),
});

export type CreateLaborItemInput = z.infer<typeof createLaborItemSchema>;
export type UpdateLaborItemInput = z.infer<typeof updateLaborItemSchema>;
