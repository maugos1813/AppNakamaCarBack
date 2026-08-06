import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const createUserSchema = z.object({
  fullName: z.string().min(2, 'fullName must be at least 2 characters long.'),
  email: z.string().email('Invalid email address.'),
  password: passwordSchema,
  roleId: z.string().min(1, 'roleId is required.'),
  phone: z.string().min(1).optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(1).nullable().optional(),
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateMeSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(1).nullable().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'currentPassword is required.'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'newPassword must be different from currentPassword.',
    path: ['newPassword'],
  });

export const listUsersQuerySchema = z.object({
  roleId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
