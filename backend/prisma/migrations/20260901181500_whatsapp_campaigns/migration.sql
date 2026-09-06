-- CreateEnum
CREATE TYPE "WhatsappTemplateStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignRecipientStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CampaignEventKind" AS ENUM ('CREATED', 'UPDATED', 'AUDIENCE_BUILT', 'STARTED', 'PAUSED', 'RESUMED', 'CANCELLED', 'COMPLETED', 'DELIVERY_FAILED');

-- CreateTable
CREATE TABLE "WhatsappTemplate" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "connectionId" UUID,
    "wabaId" TEXT NOT NULL,
    "providerTemplateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'MARKETING',
    "status" "WhatsappTemplateStatus" NOT NULL DEFAULT 'PENDING',
    "headerKind" TEXT,
    "headerText" TEXT,
    "bodyText" TEXT NOT NULL,
    "footerText" TEXT,
    "buttons" JSONB,
    "variableCount" INTEGER NOT NULL DEFAULT 0,
    "headerVariableCount" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" TEXT,
    "rejectedReason" TEXT,
    "syncedAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WhatsappTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "templateId" UUID NOT NULL,
    "connectionId" UUID,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "variableMap" JSONB NOT NULL DEFAULT '[]',
    "headerVariableMap" JSONB NOT NULL DEFAULT '[]',
    "throttlePerMinute" INTEGER NOT NULL DEFAULT 120,
    "scheduledAt" TIMESTAMPTZ,
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdById" UUID NOT NULL,
    "createdByName" TEXT NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAudience" (
    "campaignId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "addedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAudience_pkey" PRIMARY KEY ("campaignId","groupId")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "contactId" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "headerVariables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "availableAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ,
    "deliveredAt" TIMESTAMPTZ,
    "readAt" TIMESTAMPTZ,
    "failedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignEvent" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "kind" "CampaignEventKind" NOT NULL,
    "label" TEXT NOT NULL,
    "actorId" UUID,
    "actorName" TEXT NOT NULL,
    "payload" JSONB,
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsappTemplate_organizationId_status_name_idx" ON "WhatsappTemplate"("organizationId", "status", "name");

-- CreateIndex
CREATE INDEX "WhatsappTemplate_connectionId_idx" ON "WhatsappTemplate"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappTemplate_organizationId_providerTemplateId_key" ON "WhatsappTemplate"("organizationId", "providerTemplateId");

-- CreateIndex
CREATE INDEX "Campaign_organizationId_deletedAt_createdAt_id_idx" ON "Campaign"("organizationId", "deletedAt", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Campaign_organizationId_status_scheduledAt_idx" ON "Campaign"("organizationId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Campaign_templateId_idx" ON "Campaign"("templateId");

-- CreateIndex
CREATE INDEX "Campaign_branchId_idx" ON "Campaign"("branchId");

-- CreateIndex
CREATE INDEX "Campaign_connectionId_idx" ON "Campaign"("connectionId");

-- CreateIndex
CREATE INDEX "Campaign_createdById_idx" ON "Campaign"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_organizationId_normalizedName_key" ON "Campaign"("organizationId", "normalizedName");

-- CreateIndex
CREATE INDEX "CampaignAudience_groupId_idx" ON "CampaignAudience"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_providerMessageId_key" ON "CampaignRecipient"("providerMessageId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_status_availableAt_idx" ON "CampaignRecipient"("status", "availableAt");

-- CreateIndex
CREATE INDEX "CampaignRecipient_campaignId_status_createdAt_id_idx" ON "CampaignRecipient"("campaignId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "CampaignRecipient_contactId_idx" ON "CampaignRecipient"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_normalizedPhone_key" ON "CampaignRecipient"("campaignId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "CampaignEvent_campaignId_occurredAt_id_idx" ON "CampaignEvent"("campaignId", "occurredAt", "id");

-- AddForeignKey
ALTER TABLE "WhatsappTemplate" ADD CONSTRAINT "WhatsappTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappTemplate" ADD CONSTRAINT "WhatsappTemplate_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "InboxChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsappTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "InboxChannelConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAudience" ADD CONSTRAINT "CampaignAudience_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAudience" ADD CONSTRAINT "CampaignAudience_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ContactGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

