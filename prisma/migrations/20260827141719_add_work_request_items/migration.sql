-- CreateEnum
CREATE TYPE "WorkRequestStatus" AS ENUM ('PENDING', 'PRICED', 'DISMISSED');

-- CreateTable
CREATE TABLE "work_request_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "WorkRequestStatus" NOT NULL DEFAULT 'PENDING',
    "vehicleEntryId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_request_items_vehicleEntryId_idx" ON "work_request_items"("vehicleEntryId");

-- CreateIndex
CREATE INDEX "work_request_items_status_idx" ON "work_request_items"("status");

-- AddForeignKey
ALTER TABLE "work_request_items" ADD CONSTRAINT "work_request_items_vehicleEntryId_fkey" FOREIGN KEY ("vehicleEntryId") REFERENCES "vehicle_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_request_items" ADD CONSTRAINT "work_request_items_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
