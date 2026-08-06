import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma';
import { env } from '../src/config/env';

const ROLES = ['ADMIN', 'MECHANIC'] as const;

async function seedRoles() {
  const roles = await Promise.all(
    ROLES.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
  console.log(`[seed] roles ready: ${roles.map((r) => r.name).join(', ')}`);
  return roles;
}

async function seedAdminUser(adminRoleId: string) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user seed.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      fullName: 'Administrator',
      email,
      passwordHash,
      roleId: adminRoleId,
    },
  });
  console.log(`[seed] admin user ready: ${admin.email}`);
}

async function main() {
  const roles = await seedRoles();
  const adminRole = roles.find((r) => r.name === 'ADMIN');
  if (adminRole) {
    await seedAdminUser(adminRole.id);
  }
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
