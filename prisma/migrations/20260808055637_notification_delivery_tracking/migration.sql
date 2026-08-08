-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "notifications_relatedVehicleEntryId_idx" ON "notifications"("relatedVehicleEntryId");
