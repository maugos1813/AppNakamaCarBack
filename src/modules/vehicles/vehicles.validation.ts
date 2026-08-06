import { z } from 'zod';

const fuelTypeSchema = z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'LPG', 'CNG']);

const currentYear = new Date().getFullYear();

export const createVehicleSchema = z.object({
  clientId: z.string().min(1, 'clientId is required.'),
  licensePlate: z
    .string()
    .min(4, 'licensePlate is required.')
    .transform((value) => value.toUpperCase().replace(/\s+/g, '')),
  vin: z
    .string()
    .length(17, 'vin must be 17 characters long.')
    .transform((value) => value.toUpperCase())
    .optional(),
  make: z.string().min(1, 'make is required.'),
  model: z.string().min(1, 'model is required.'),
  year: z.coerce.number().int().min(1900).max(currentYear + 1).optional(),
  color: z.string().optional(),
  fuelType: fuelTypeSchema.optional(),
  notes: z.string().optional(),
});

export const updateVehicleSchema = z.object({
  clientId: z.string().min(1).optional(),
  licensePlate: z
    .string()
    .min(4)
    .transform((value) => value.toUpperCase().replace(/\s+/g, ''))
    .optional(),
  vin: z
    .string()
    .length(17)
    .transform((value) => value.toUpperCase())
    .nullable()
    .optional(),
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  year: z.coerce.number().int().min(1900).max(currentYear + 1).nullable().optional(),
  color: z.string().nullable().optional(),
  fuelType: fuelTypeSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const listVehiclesQuerySchema = z.object({
  clientId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
