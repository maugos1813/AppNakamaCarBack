import { z } from 'zod';

const severitySchema = z.enum(['MINOR', 'MODERATE', 'SEVERE']);

export const createDamageSchema = z.object({
  area: z.string().min(1, 'area is required.'),
  description: z.string().min(1, 'description is required.'),
  severity: severitySchema,
});

export const updateDamageSchema = z.object({
  area: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  severity: severitySchema.optional(),
});

export type CreateDamageInput = z.infer<typeof createDamageSchema>;
export type UpdateDamageInput = z.infer<typeof updateDamageSchema>;
