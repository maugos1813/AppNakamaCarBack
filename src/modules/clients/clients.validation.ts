import { z } from 'zod';

const fiscalCodeSchema = z
  .string()
  .regex(/^[A-Za-z0-9]{16}$/, 'fiscalCode must be 16 alphanumeric characters.');

const vatNumberSchema = z.string().regex(/^[0-9]{11}$/, 'vatNumber must be 11 digits.');

export const createClientSchema = z
  .object({
    isCompany: z.boolean().default(false),
    fullName: z.string().min(2, 'fullName must be at least 2 characters long.'),
    companyName: z.string().min(2).optional(),
    fiscalCode: fiscalCodeSchema.optional(),
    vatNumber: vatNumberSchema.optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5, 'phone is required.'),
    addressLine: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    province: z.string().optional(),
    country: z.string().length(2).default('IT'),
    notes: z.string().optional(),
  })
  .refine((data) => !data.isCompany || !!data.companyName, {
    message: 'companyName is required when isCompany is true.',
    path: ['companyName'],
  })
  .refine((data) => !data.isCompany || !!data.vatNumber, {
    message: 'vatNumber is required when isCompany is true.',
    path: ['vatNumber'],
  });

export const updateClientSchema = z.object({
  isCompany: z.boolean().optional(),
  fullName: z.string().min(2).optional(),
  companyName: z.string().min(2).nullable().optional(),
  fiscalCode: fiscalCodeSchema.nullable().optional(),
  vatNumber: vatNumberSchema.nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(5).optional(),
  addressLine: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  country: z.string().length(2).optional(),
  notes: z.string().nullable().optional(),
});

export const listClientsQuerySchema = z.object({
  search: z.string().optional(),
  isCompany: z.coerce.boolean().optional(),
  portalEnabled: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
