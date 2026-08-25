-- AlterTable
ALTER TABLE "labor_items" ADD COLUMN     "approvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "parts" ADD COLUMN     "approvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "other_costs" ADD COLUMN     "approvedAt" TIMESTAMP(3);
