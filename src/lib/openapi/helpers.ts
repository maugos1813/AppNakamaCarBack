import { z } from 'zod';
import { registry, successEnvelope, errorResponses, jsonContent, AUTH } from './registry';

type Method = 'get' | 'post' | 'patch' | 'delete';

interface RegisterOptions {
  method: Method;
  path: string;
  tags: string[];
  summary: string;
  auth?: boolean;
  params?: z.ZodObject;
  query?: z.ZodObject;
  body?: z.ZodTypeAny;
  successStatus?: 200 | 201;
  successSchema?: z.ZodTypeAny;
  successDescription?: string;
}

/** Thin wrapper over registry.registerPath that fills in the repetitive parts
 * (standard success envelope, standard error responses, bearer auth) so each
 * module's endpoint list stays readable as a single declarative line. */
export function reg({
  method,
  path,
  tags,
  summary,
  auth = true,
  params,
  query,
  body,
  successStatus = 200,
  successSchema,
  successDescription = 'OK',
}: RegisterOptions) {
  registry.registerPath({
    method,
    path,
    tags,
    summary,
    security: auth ? AUTH : [],
    request: {
      ...(params ? { params } : {}),
      ...(query ? { query } : {}),
      ...(body ? { body: { content: { 'application/json': { schema: body } } } } : {}),
    },
    responses: {
      [successStatus]: jsonContent(
        successEnvelope(successSchema ?? z.record(z.string(), z.unknown())),
        successDescription,
      ),
      ...errorResponses,
    },
  });
}
