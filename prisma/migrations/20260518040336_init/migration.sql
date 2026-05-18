-- CreateEnum
CREATE TYPE "GoodsType" AS ENUM ('TEXT', 'FILE');

-- CreateEnum
CREATE TYPE "GoodsStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "GoodsFileStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'REDEEMED', 'DELETED');

-- CreateEnum
CREATE TYPE "CardKeyStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'DELETED');

-- CreateEnum
CREATE TYPE "DownloadResult" AS ENUM ('SUCCESS', 'ALREADY_DOWNLOADED', 'NOT_FOUND', 'ERROR');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfTokenHash" TEXT,
    "adminUserId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GoodsType" NOT NULL,
    "textContent" TEXT,
    "status" "GoodsStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsFile" (
    "id" TEXT NOT NULL,
    "goodsId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "GoodsFileStatus" NOT NULL DEFAULT 'AVAILABLE',
    "reservedByCardKeyId" TEXT,
    "redeemedByRedemptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservedAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "GoodsFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardKey" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyMask" TEXT NOT NULL,
    "goodsId" TEXT NOT NULL,
    "goodsType" "GoodsType" NOT NULL,
    "fileQuantity" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "status" "CardKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CardKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "cardKeyId" TEXT NOT NULL,
    "goodsId" TEXT NOT NULL,
    "receiptTokenHash" TEXT NOT NULL,
    "receiptTokenMask" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zipPath" TEXT,
    "zipSizeBytes" INTEGER,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "firstDownloadedAt" TIMESTAMP(3),

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionFile" (
    "id" TEXT NOT NULL,
    "redemptionId" TEXT NOT NULL,
    "goodsFileId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedemptionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadLog" (
    "id" TEXT NOT NULL,
    "redemptionId" TEXT,
    "receiptTokenHash" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "result" "DownloadResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_adminUserId_idx" ON "AdminSession"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "Goods_type_status_idx" ON "Goods"("type", "status");

-- CreateIndex
CREATE INDEX "GoodsFile_goodsId_status_idx" ON "GoodsFile"("goodsId", "status");

-- CreateIndex
CREATE INDEX "GoodsFile_reservedByCardKeyId_idx" ON "GoodsFile"("reservedByCardKeyId");

-- CreateIndex
CREATE INDEX "GoodsFile_redeemedByRedemptionId_idx" ON "GoodsFile"("redeemedByRedemptionId");

-- CreateIndex
CREATE UNIQUE INDEX "CardKey_keyHash_key" ON "CardKey"("keyHash");

-- CreateIndex
CREATE INDEX "CardKey_goodsId_status_idx" ON "CardKey"("goodsId", "status");

-- CreateIndex
CREATE INDEX "CardKey_expiresAt_idx" ON "CardKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_cardKeyId_key" ON "Redemption"("cardKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_receiptTokenHash_key" ON "Redemption"("receiptTokenHash");

-- CreateIndex
CREATE INDEX "Redemption_goodsId_redeemedAt_idx" ON "Redemption"("goodsId", "redeemedAt");

-- CreateIndex
CREATE INDEX "RedemptionFile_goodsFileId_idx" ON "RedemptionFile"("goodsFileId");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionFile_redemptionId_goodsFileId_key" ON "RedemptionFile"("redemptionId", "goodsFileId");

-- CreateIndex
CREATE INDEX "DownloadLog_redemptionId_createdAt_idx" ON "DownloadLog"("redemptionId", "createdAt");

-- CreateIndex
CREATE INDEX "DownloadLog_receiptTokenHash_idx" ON "DownloadLog"("receiptTokenHash");

-- CreateIndex
CREATE INDEX "DownloadLog_createdAt_idx" ON "DownloadLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_scope_identifier_windowStart_key" ON "RateLimitBucket"("scope", "identifier", "windowStart");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsFile" ADD CONSTRAINT "GoodsFile_goodsId_fkey" FOREIGN KEY ("goodsId") REFERENCES "Goods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsFile" ADD CONSTRAINT "GoodsFile_reservedByCardKeyId_fkey" FOREIGN KEY ("reservedByCardKeyId") REFERENCES "CardKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsFile" ADD CONSTRAINT "GoodsFile_redeemedByRedemptionId_fkey" FOREIGN KEY ("redeemedByRedemptionId") REFERENCES "Redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardKey" ADD CONSTRAINT "CardKey_goodsId_fkey" FOREIGN KEY ("goodsId") REFERENCES "Goods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_cardKeyId_fkey" FOREIGN KEY ("cardKeyId") REFERENCES "CardKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_goodsId_fkey" FOREIGN KEY ("goodsId") REFERENCES "Goods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionFile" ADD CONSTRAINT "RedemptionFile_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionFile" ADD CONSTRAINT "RedemptionFile_goodsFileId_fkey" FOREIGN KEY ("goodsFileId") REFERENCES "GoodsFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadLog" ADD CONSTRAINT "DownloadLog_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "Redemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
