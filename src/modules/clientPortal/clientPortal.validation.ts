import { z } from 'zod';

export const rejectEstimateSchema = z.object({
  reason: z.string().optional(),
});

export type RejectEstimateInput = z.infer<typeof rejectEstimateSchema>;
