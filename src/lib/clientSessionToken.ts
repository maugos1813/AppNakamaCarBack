import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const SESSION_TYPE = 'client_session';
const SESSION_EXPIRES_IN = '30d';

const SETUP_TYPE = 'client_portal_setup';
const SETUP_EXPIRES_IN = '48h';

interface ClientSessionPayload {
  type: typeof SESSION_TYPE;
  clientId: string;
}

interface ClientPortalSetupPayload {
  type: typeof SETUP_TYPE;
  clientId: string;
}

// The persistent fleet-portal session — distinct from clientAccessToken.ts's
// single-entry tracking link and from staff auth, sharing only JWT_SECRET.
export function signClientSessionToken(clientId: string): string {
  const payload: ClientSessionPayload = { type: SESSION_TYPE, clientId };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: SESSION_EXPIRES_IN });
}

export function verifyClientSessionToken(token: string): string {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || decoded.type !== SESSION_TYPE || typeof decoded.clientId !== 'string') {
    throw new Error('Invalid client session token.');
  }
  return decoded.clientId;
}

// One token, two uses: the initial "activate your account" link an admin
// triggers, and any later "forgot password" request — both just need to
// prove the requester controls the client's email and let them set a
// (new) password.
export function signClientPortalSetupToken(clientId: string): string {
  const payload: ClientPortalSetupPayload = { type: SETUP_TYPE, clientId };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: SETUP_EXPIRES_IN });
}

export function verifyClientPortalSetupToken(token: string): string {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || decoded.type !== SETUP_TYPE || typeof decoded.clientId !== 'string') {
    throw new Error('Invalid client portal setup token.');
  }
  return decoded.clientId;
}

export function buildClientPortalSetupUrl(clientId: string): string {
  const token = signClientPortalSetupToken(clientId);
  return `${env.FRONTEND_URL}/portal/set-password?token=${token}`;
}
