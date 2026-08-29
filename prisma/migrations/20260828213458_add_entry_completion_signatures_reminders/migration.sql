-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "lastOverdueReminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vehicle_entries" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedByUserId" TEXT,
ADD COLUMN     "deliverySignatureUrl" TEXT,
ADD COLUMN     "deliverySignedAt" TIMESTAMP(3),
ADD COLUMN     "deliverySignedByName" TEXT,
ADD COLUMN     "intakeSignatureUrl" TEXT,
ADD COLUMN     "intakeSignedAt" TIMESTAMP(3),
ADD COLUMN     "intakeSignedByName" TEXT,
ADD COLUMN     "lastPickupReminderSentAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "vehicle_entries" ADD CONSTRAINT "vehicle_entries_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
