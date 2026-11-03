-- AlterTable
ALTER TABLE "User" ADD COLUMN "password" TEXT NOT NULL DEFAULT '';

-- Remove default after backfill so new rows must provide password
ALTER TABLE "User" ALTER COLUMN "password" DROP DEFAULT;
