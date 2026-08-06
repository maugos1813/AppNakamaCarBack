import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { ApiError, type ApiErrorDetail } from '../utils/ApiError';
import { isProduction } from '../config/env';
import { logger } from '../lib/logger';

interface ErrorResponseShape {
  statusCode: number;
  message: string;
  errors: ApiErrorDetail[];
}

function resolveError(err: unknown): ErrorResponseShape {
  if (err instanceof ApiError) {
    return { statusCode: err.statusCode, message: err.message, errors: err.errors };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: 400,
      message: 'Validation failed.',
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large.' : `Upload error: ${err.message}`;
    return { statusCode: 400, message, errors: [] };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
        return {
          statusCode: 409,
          message: `A record with this ${target} already exists.`,
          errors: [],
        };
      }
      case 'P2025':
        return { statusCode: 404, message: 'Resource not found.', errors: [] };
      case 'P2003':
        return { statusCode: 409, message: 'This operation violates a related record constraint.', errors: [] };
      default:
        return { statusCode: 500, message: 'Database error.', errors: [] };
    }
  }

  // express.json()/express.urlencoded() reject malformed request bodies with
  // a SyntaxError that carries `status: 400` — a client mistake, not a server one.
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    return { statusCode: 400, message: 'Malformed request body.', errors: [] };
  }

  if (err instanceof Error) {
    return { statusCode: 500, message: isProduction ? 'Internal server error.' : err.message, errors: [] };
  }

  return { statusCode: 500, message: 'Internal server error.', errors: [] };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const { statusCode, message, errors } = resolveError(err);

  if (statusCode >= 500) {
    (req.log ?? logger).error({ err }, `Unhandled error on ${req.method} ${req.originalUrl}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
}
