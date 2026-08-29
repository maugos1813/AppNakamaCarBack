import { z } from 'zod';

export const mechanicProductivityQuerySchema = z.object({
  months: z.coerce.number().int().positive().max(24).default(6),
});

export type MechanicProductivityQuery = z.infer<typeof mechanicProductivityQuerySchema>;
