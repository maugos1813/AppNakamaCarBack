import { Prisma, type DeviceToken } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type DeviceTokenRecord = DeviceToken;

export const deviceTokensRepository = {
  // Unique on token — re-registering the same device just reassigns it to
  // whoever's logged in there now (e.g. a shared tablet, or an account
  // switch), instead of erroring on the unique constraint.
  upsert(token: string, data: Prisma.DeviceTokenUncheckedCreateInput): Promise<DeviceTokenRecord> {
    return prisma.deviceToken.upsert({
      where: { token },
      create: data,
      update: { userId: data.userId, platform: data.platform },
    });
  },

  findTokensByUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return Promise.resolve([]);
    return prisma.deviceToken
      .findMany({ where: { userId: { in: userIds } }, select: { token: true } })
      .then((rows) => rows.map((r) => r.token));
  },

  async deleteByTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await prisma.deviceToken.deleteMany({ where: { token: { in: tokens } } });
  },
};
