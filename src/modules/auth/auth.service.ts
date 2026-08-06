import bcrypt from 'bcrypt';
import { ApiError } from '../../utils/ApiError';
import { signAccessToken } from '../../lib/jwt';
import { usersRepository } from '../users/users.repository';
import { toPublicUser } from '../users/users.service';
import type { LoginInput } from './auth.validation';

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
};
