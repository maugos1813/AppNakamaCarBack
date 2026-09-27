import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface SsoTicketPayload {
  email: string;
}

/**
 * Verifies a single sign-on ticket minted by OneSystec's backend, signed with a
 * secret shared out-of-band — separate from this app's own JWT_SECRET, since the
 * ticket only proves "this email just authenticated with OneSystec", nothing more.
 * Throws if SSO_SHARED_SECRET isn't configured or the ticket is invalid/expired.
 */
export function verifySsoTicket(ticket: string): SsoTicketPayload {
  if (!env.SSO_SHARED_SECRET) {
    throw new Error('SSO_SHARED_SECRET is not configured');
  }
  const decoded = jwt.verify(ticket, env.SSO_SHARED_SECRET);
  if (typeof decoded === 'string' || typeof decoded.email !== 'string') {
    throw new Error('Invalid ticket payload.');
  }
  return { email: decoded.email };
}
