import { z } from 'zod';

const stageStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED']);

export const updateStageSchema = z.object({
  status: stageStatusSchema.optional(),
  assignedMechanicId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type UpdateStageInput = z.infer<typeof updateStageSchema>;
