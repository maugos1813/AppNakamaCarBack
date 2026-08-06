import type { Response } from 'express';

/**
 * Standard success envelope used by every endpoint in the API:
 * { success: true, message, data }
 */
export function sendSuccess<T>(
  res: Response,
  { statusCode = 200, message, data }: { statusCode?: number; message: string; data?: T },
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
  });
}
