import { z } from 'zod';

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;
