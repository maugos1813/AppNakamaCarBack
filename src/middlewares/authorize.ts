import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

// Must run after `authenticate`, which populates req.user.
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action.');
    }
    next();
  };
}
