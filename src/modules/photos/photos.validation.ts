import { z } from 'zod';

export const uploadPhotoSchema = z.object({
  category: z.enum(['INTAKE', 'DAMAGE', 'PROGRESS', 'COMPLETION']),
  caption: z.string().optional(),
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;
