import type { NextFunction, Request, Response } from 'express';
import { verifyClientSessionToken } from '../lib/clientSessionToken';
import { clientsRepository } from '../modules/clients/clients.repository';
import { ApiError } from '../utils/ApiError';

export async function authenticateClientSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token is missing.');
  }

  const token = header.slice('Bearer '.length);

  let clientId: string;
  try {
    clientId = verifyClientSessionToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token.');
  }

  // Checked fresh on every request, not trusted from the token — an admin
  // revoking portal access takes effect immediately, not at token expiry.
  const client = await clientsRepository.findById(clientId);
  if (!client || !client.portalEnabled) {
    throw ApiError.unauthorized('Account is inactive or no longer exists.');
  }

  req.clientSession = { id: client.id, email: client.email ?? '', fullName: client.fullName };
  next();
}
