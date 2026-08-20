import bcrypt from 'bcrypt';
import request from 'supertest';
import { env } from '../../src/config/env';
import { app } from './app';
import { prisma } from './db';

type RoleName = 'ADMIN' | 'MECHANIC';

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export async function createUserWithRole(
  roleName: RoleName,
  overrides: Partial<{ email: string; password: string; fullName: string; isActive: boolean }> = {},
) {
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName },
  });

  const email = overrides.email ?? `${unique(roleName.toLowerCase())}@test.local`;
  const password = overrides.password ?? 'TestPass123';
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName: overrides.fullName ?? `${roleName} Test`,
      email,
      passwordHash,
      roleId: role.id,
      isActive: overrides.isActive ?? true,
    },
  });

  return { user, email, password, role };
}

export async function loginAs(roleName: RoleName, overrides: Parameters<typeof createUserWithRole>[1] = {}) {
  const { email, password, user } = await createUserWithRole(roleName, overrides);
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`loginAs(${roleName}) failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.data.accessToken as string, userId: user.id, email };
}
