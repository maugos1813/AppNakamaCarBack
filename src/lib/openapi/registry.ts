import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Must run before any zod schema is used in a registerPath() call — it patches
// the shared ZodType prototype with the .openapi() metadata mechanism that
// the generator relies on, even for schemas that never call .openapi() themselves.
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

export const idParam = z.object({ id: z.string().openapi({ example: 'clx1a2b3c4d5e6f7g8h9i0j' }) });
export const entryIdParam = z.object({ entryId: z.string() });

export function successEnvelope(dataSchema: z.ZodTypeAny) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
  });
}

export const errorEnvelope = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(z.object({ field: z.string().optional(), message: z.string() })),
});

export const jsonContent = (schema: z.ZodTypeAny, description = 'OK') => ({
  description,
  content: { 'application/json': { schema } },
});

export const errorResponses = {
  400: jsonContent(errorEnvelope, 'Validation error'),
  401: jsonContent(errorEnvelope, 'Missing or invalid authentication token'),
  403: jsonContent(errorEnvelope, 'Insufficient role'),
  404: jsonContent(errorEnvelope, 'Resource not found'),
  409: jsonContent(errorEnvelope, 'Conflict (duplicate or constraint violation)'),
};

export const AUTH = [{ bearerAuth: [] }];
