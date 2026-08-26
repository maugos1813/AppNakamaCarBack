import { z } from 'zod';

export const clientLoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const clientSetPasswordSchema = z.object({
  token: z.string().min(1, 'token is required.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
});

export const clientForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address.'),
});

export type ClientLoginInput = z.infer<typeof clientLoginSchema>;
export type ClientSetPasswordInput = z.infer<typeof clientSetPasswordSchema>;
export type ClientForgotPasswordInput = z.infer<typeof clientForgotPasswordSchema>;
