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
};
