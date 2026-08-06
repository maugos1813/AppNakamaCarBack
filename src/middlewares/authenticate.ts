import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { usersRepository } from '../modules/users/users.repository';
import { ApiError } from '../utils/ApiError';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token is missing.');
  }

  const token = header.slice('Bearer '.length);

  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    throw ApiError.unauthorized('Invalid or expired token.');
  }

  // Looked up on every request (not trusted from the token) so a deactivated
  // account or a role change takes effect immediately, not at token expiry.
  const user = await usersRepository.findById(userId);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account is inactive or no longer exists.');
  }

  req.user = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role.name,
  };

  next();
}
