import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type UserWithRole = Prisma.UserGetPayload<{ include: { role: true } }>;

interface ListUsersFilters {
  roleId?: string;
  isActive?: boolean;
}

interface Pagination {
  page: number;
  pageSize: number;
}

export const usersRepository = {
  findById(id: string): Promise<UserWithRole | null> {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  },

  findByEmail(email: string): Promise<UserWithRole | null> {
    return prisma.user.findUnique({ where: { email }, include: { role: true } });
  },

  async findMany(
    filters: ListUsersFilters,
    { page, pageSize }: Pagination,
  ): Promise<{ items: UserWithRole[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...(filters.roleId ? { roleId: filters.roleId } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  },

  create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    roleId: string;
    phone?: string;
  }): Promise<UserWithRole> {
    return prisma.user.create({ data, include: { role: true } });
  },

  update(
    id: string,
    data: Partial<{
      fullName: string;
      phone: string | null;
      roleId: string;
      isActive: boolean;
      passwordHash: string;
      lastLoginAt: Date;
    }>,
  ): Promise<UserWithRole> {
    return prisma.user.update({ where: { id }, data, include: { role: true } });
  },

  listRoles() {
    return prisma.role.findMany({ orderBy: { name: 'asc' } });
  },

  findRoleById(id: string) {
    return prisma.role.findUnique({ where: { id } });
  },
};
