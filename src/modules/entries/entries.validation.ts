import { z } from 'zod';

const fuelLevelSchema = z.enum(['EMPTY', 'QUARTER', 'HALF', 'THREE_QUARTERS', 'FULL']);
const entryStatusSchema = z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELIVERED']);

export const createEntrySchema = z.object({
  vehicleId: z.string().min(1, 'vehicleId is required.'),
  entryDate: z.coerce.date().optional(),
  odometerReading: z.coerce.number().int().min(0, 'odometerReading must be 0 or greater.'),
  fuelLevel: fuelLevelSchema,
  exteriorConditionNotes: z.string().optional(),
  hasSpareTire: z.boolean().default(false),
  hasDocuments: z.boolean().default(false),
  estimatedCompletionDate: z.coerce.date().optional(),
});

export const updateEntrySchema = z.object({
  odometerReading: z.coerce.number().int().min(0).optional(),
  fuelLevel: fuelLevelSchema.optional(),
  exteriorConditionNotes: z.string().nullable().optional(),
  hasSpareTire: z.boolean().optional(),
  hasDocuments: z.boolean().optional(),
  estimatedCompletionDate: z.coerce.date().nullable().optional(),
});

export const changeEntryStatusSchema = z.object({
  status: entryStatusSchema,
  notes: z.string().optional(),
});

// Captured in person on a staff device (signature pad), sent up as a PNG
// data URL rather than a multipart file since it's canvas-generated, not a
// user-picked file.
export const captureSignatureSchema = z.object({
  type: z.enum(['INTAKE', 'DELIVERY']),
  signerName: z.string().min(1, 'signerName is required.'),
  imageDataUrl: z.string().startsWith('data:image/', 'imageDataUrl must be an image data URL.'),
});

export const listEntriesQuerySchema = z.object({
  vehicleId: z.string().optional(),
  clientId: z.string().optional(),
  status: entryStatusSchema.optional(),
  search: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type ChangeEntryStatusInput = z.infer<typeof changeEntryStatusSchema>;
export type CaptureSignatureInput = z.infer<typeof captureSignatureSchema>;
export type ListEntriesQuery = z.infer<typeof listEntriesQuerySchema>;
