import bcrypt from 'bcrypt';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { signAccessToken } from '../../lib/jwt';
import { buildPasswordResetUrl, verifyPasswordResetToken } from '../../lib/passwordResetToken';
import { sendEmail } from '../../lib/email';
import { logger } from '../../lib/logger';
import { usersRepository } from '../users/users.repository';
import { toPublicUser } from '../users/users.service';
import { buildEmailHtml } from '../notifications/notifications.service';
import type { ForgotPasswordInput, LoginInput, ResetPasswordInput } from './auth.validation';

export const authService = {
  async login(input: LoginInput) {
    const user = await usersRepository.findByEmail(input.email);

    // Same generic error for "no such user" and "wrong password" — avoids
    // leaking which emails are registered.
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const updatedUser = await usersRepository.update(user.id, { lastLoginAt: new Date() });
    const accessToken = signAccessToken(user.id);

    return { accessToken, user: toPublicUser(updatedUser) };
  },

  async getMe(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found.');
    }
    return toPublicUser(user);
  },

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await usersRepository.findByEmail(input.email);

    // Always the same response whether or not the email matches an active
    // user — otherwise this endpoint becomes a way to enumerate staff
    // accounts. The email itself, not the HTTP response, carries the result.
    if (!user || !user.isActive) {
      return;
    }

    const resetUrl = buildPasswordResetUrl(user.id);

    try {
      await sendEmail(
        user.email,
        'Restablece tu contraseña — NakamaCar',
        buildEmailHtml(
          'Restablece tu contraseña',
          'Recibimos una solicitud para restablecer la contraseña de tu cuenta del panel de NakamaCar. El enlace expira en 30 minutos. Si no fuiste vos, podés ignorar este correo.',
          { url: resetUrl, label: 'Restablecer contraseña' },
        ),
      );
    } catch (err) {
      logger.error({ err }, 'Failed to send password reset email.');
    }
  },

  async resetPassword(input: ResetPasswordInput) {
    let userId: string;
    try {
      userId = verifyPasswordResetToken(input.token);
    } catch {
      throw ApiError.badRequest('This reset link is invalid or has expired.');
    }

    const user = await usersRepository.findById(userId);
    if (!user || !user.isActive) {
      throw ApiError.badRequest('This reset link is invalid or has expired.');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
    await usersRepository.update(user.id, { passwordHash });
  },
};
