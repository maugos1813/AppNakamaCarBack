import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const PASSWORD_RESET_TOKEN_TYPE = 'password_reset';
const EXPIRES_IN = '30m';

interface PasswordResetPayload {
  type: typeof PASSWORD_RESET_TOKEN_TYPE;
  userId: string;
}

// Same trust model as clientAccessToken.ts — the token IS the credential.
// Shares JWT_SECRET with staff auth but carries its own `type` claim so it
// can never be mistaken for a login session token or a client access token.
export function signPasswordResetToken(userId: string): string {
  const payload: PasswordResetPayload = { type: PASSWORD_RESET_TOKEN_TYPE, userId };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyPasswordResetToken(token: string): string {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded === 'string' || decoded.type !== PASSWORD_RESET_TOKEN_TYPE || typeof decoded.userId !== 'string') {
    throw new Error('Invalid password reset token.');
  }

  return decoded.userId;
}

export function buildPasswordResetUrl(userId: string): string {
  const token = signPasswordResetToken(userId);
  return `${env.FRONTEND_URL}/reset-password?token=${token}`;
}
