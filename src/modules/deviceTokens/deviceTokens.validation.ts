import { z } from 'zod';

export const registerDeviceTokenSchema = z.object({
  token: z.string().min(1, 'token is required.'),
  platform: z.enum(['android', 'ios']).default('android'),
});

export type RegisterDeviceTokenInput = z.infer<typeof registerDeviceTokenSchema>;
