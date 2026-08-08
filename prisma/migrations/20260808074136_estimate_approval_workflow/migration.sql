-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ESTIMATE_PENDING_APPROVAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RepairHistoryEventType" ADD VALUE 'ESTIMATE_APPROVED';
ALTER TYPE "RepairHistoryEventType" ADD VALUE 'ESTIMATE_REJECTED';

-- AlterTable
ALTER TABLE "vehicle_entries" ADD COLUMN     "estimateRespondedAt" TIMESTAMP(3),
ADD COLUMN     "estimateStatus" "EstimateStatus" NOT NULL DEFAULT 'DRAFT';
