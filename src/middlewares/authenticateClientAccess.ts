import type { NextFunction, Request, Response } from 'express';
import { verifyClientAccessToken } from '../lib/clientAccessToken';
import { entriesRepository } from '../modules/entries/entries.repository';
import { ApiError } from '../utils/ApiError';

export async function authenticateClientAccess(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.params.token;
  if (!token || typeof token !== 'string') {
    throw ApiError.unauthorized('Missing access token.');
  }

  let decoded: { entryId: string; clientId: string };
  try {
    decoded = verifyClientAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired access link.');
  }

  // Re-check against the current DB state (not just trusting the token
  // payload) so a client whose entry was somehow reassigned can't use a
  // stale link to reach a different one.
  const entry = await entriesRepository.findById(decoded.entryId);
  if (!entry || entry.vehicle.clientId !== decoded.clientId) {
    throw ApiError.unauthorized('Invalid or expired access link.');
  }

  req.clientAccess = { entryId: decoded.entryId, clientId: decoded.clientId };
  next();
}
