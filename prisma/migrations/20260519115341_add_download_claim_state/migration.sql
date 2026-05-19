-- CreateEnum
CREATE TYPE "RedemptionDownloadState" AS ENUM ('AVAILABLE', 'IN_PROGRESS', 'DOWNLOADED');

-- AlterTable
ALTER TABLE "Redemption" ADD COLUMN     "downloadClaimExpiresAt" TIMESTAMP(3),
ADD COLUMN     "downloadClaimTokenHash" TEXT,
ADD COLUMN     "downloadState" "RedemptionDownloadState" NOT NULL DEFAULT 'AVAILABLE';

-- CreateIndex
CREATE INDEX "Redemption_downloadState_downloadClaimExpiresAt_idx" ON "Redemption"("downloadState", "downloadClaimExpiresAt");
