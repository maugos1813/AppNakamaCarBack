import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const CLIENT_ACCESS_TOKEN_TYPE = 'client_access';
const EXPIRES_IN = '90d';

interface ClientAccessPayload {
  type: typeof CLIENT_ACCESS_TOKEN_TYPE;
  entryId: string;
  clientId: string;
}

/**
 * Stateless, passwordless access to a single VehicleEntry — the token IS the
 * credential (same trust model as a password-reset or invoice-payment link).
 * Uses the same JWT_SECRET as staff auth but a distinct `type` claim, checked
 * explicitly on verify, so a client link can never be mistaken for a staff
 * session token (or vice versa) even though they share a signing key.
 */
export function signClientAccessToken(entryId: string, clientId: string): string {
  const payload: ClientAccessPayload = { type: CLIENT_ACCESS_TOKEN_TYPE, entryId, clientId };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyClientAccessToken(token: string): { entryId: string; clientId: string } {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (
    typeof decoded === 'string' ||
    decoded.type !== CLIENT_ACCESS_TOKEN_TYPE ||
    typeof decoded.entryId !== 'string' ||
    typeof decoded.clientId !== 'string'
  ) {
    throw new Error('Invalid client access token.');
  }

  return { entryId: decoded.entryId, clientId: decoded.clientId };
}

export function buildClientTrackingUrl(entryId: string, clientId: string): string {
  const token = signClientAccessToken(entryId, clientId);
  return `${env.FRONTEND_URL}/track?token=${token}`;
}
