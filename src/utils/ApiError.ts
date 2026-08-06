export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/**
 * Thrown intentionally from services/controllers for expected failure cases
 * (not found, validation, conflict, unauthorized, etc). The centralized error
 * handler knows how to serialize this into the standard error response shape.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, errors: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors: ApiErrorDetail[] = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized.') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden.') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(404, message);
  }

  static conflict(message: string, errors: ApiErrorDetail[] = []) {
    return new ApiError(409, message, errors);
  }
}
