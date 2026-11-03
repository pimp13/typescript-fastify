-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN_GENERAL';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "meta" JSONB DEFAULT '{}';

-- CreateIndex
CREATE INDEX "User_isActive_role_idx" ON "User"("isActive", "role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
