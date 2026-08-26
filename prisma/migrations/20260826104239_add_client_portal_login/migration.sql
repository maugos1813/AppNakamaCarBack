-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "portalEnabled" BOOLEAN NOT NULL DEFAULT false;
