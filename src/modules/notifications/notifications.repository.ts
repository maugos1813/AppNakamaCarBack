import { Prisma, type Notification } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type NotificationRecord = Notification;

export const notificationsRepository = {
  create(data: Prisma.NotificationUncheckedCreateInput): Promise<NotificationRecord> {
    return prisma.notification.create({ data });
  },

  markSent(id: string, providerMessageId: string): Promise<NotificationRecord> {
    return prisma.notification.update({
      where: { id },
      data: { status: 'SENT', providerMessageId, sentAt: new Date() },
    });
  },

  markFailed(id: string, errorMessage: string): Promise<NotificationRecord> {
    return prisma.notification.update({
      where: { id },
      data: { status: 'FAILED', errorMessage },
    });
  },

  findByEntryId(vehicleEntryId: string): Promise<NotificationRecord[]> {
    return prisma.notification.findMany({
      where: { relatedVehicleEntryId: vehicleEntryId },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Staff-facing in-app notifications (e.g. "new Richiesta") — a distinct
  // list from findByEntryId, which is the client-facing send log an admin
  // reviews from inside one entry.
  findByUserId(userId: string, limit = 50): Promise<NotificationRecord[]> {
    return prisma.notification.findMany({
      where: { recipientUserId: userId, channel: 'IN_APP' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async markRead(id: string, userId: string): Promise<NotificationRecord | null> {
    const result = await prisma.notification.updateMany({
      where: { id, recipientUserId: userId },
      data: { isRead: true },
    });
    if (result.count === 0) return null;
    return prisma.notification.findUnique({ where: { id } });
  },

  findActiveAdminIds(): Promise<{ id: string }[]> {
    return prisma.user.findMany({
      where: { isActive: true, role: { name: 'ADMIN' } },
      select: { id: true },
    });
  },
};
