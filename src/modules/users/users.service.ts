import bcrypt from 'bcrypt';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { usersRepository, type UserWithRole } from './users.repository';
import type {
  ChangePasswordInput,
  CreateUserInput,
  ListUsersQuery,
  UpdateMeInput,
  UpdateUserInput,
} from './users.validation';

export function toPublicUser(user: UserWithRole) {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

async function assertRoleExists(roleId: string) {
  const role = await usersRepository.findRoleById(roleId);
  if (!role) {
    throw ApiError.badRequest('roleId does not match an existing role.');
  }
}

export const usersService = {
  async listUsers(query: ListUsersQuery) {
    const { items, total } = await usersRepository.findMany(
      { roleId: query.roleId, isActive: query.isActive },
      { page: query.page, pageSize: query.pageSize },
    );

    return {
      items: items.map(toPublicUser),
      pagination: { page: query.page, pageSize: query.pageSize, total },
    };
  },

  async getUserById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found.');
    }
    return toPublicUser(user);
  },

  async createUser(input: CreateUserInput) {
    await assertRoleExists(input.roleId);

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

    const user = await usersRepository.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      roleId: input.roleId,
      phone: input.phone,
    });

    return toPublicUser(user);
  },

  async updateUser(id: string, input: UpdateUserInput) {
    const existing = await usersRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('User not found.');
    }

    if (input.roleId) {
      await assertRoleExists(input.roleId);
    }

    const updated = await usersRepository.update(id, input);
    return toPublicUser(updated);
  },

  async updateMe(id: string, input: UpdateMeInput) {
    const updated = await usersRepository.update(id, input);
    return toPublicUser(updated);
  },

  async changeOwnPassword(id: string, input: ChangePasswordInput) {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    const isCurrentPasswordValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
    await usersRepository.update(id, { passwordHash });
  },

  listRoles() {
    return usersRepository.listRoles();
  },
};
