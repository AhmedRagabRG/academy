-- CreateEnum
CREATE TYPE "InboxChannelProvider" AS ENUM ('META_WHATSAPP', 'META_MESSENGER', 'META_INSTAGRAM');

-- CreateEnum
CREATE TYPE "InboxChannelStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'WEBSITE', 'PHONE', 'MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "ContactFieldKind" AS ENUM ('TEXT', 'NUMBER', 'DATE');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "LeadOutcome" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadActivityKind" AS ENUM ('CREATED', 'STAGE_CHANGED', 'ASSIGNED', 'UPDATED', 'NOTE');

-- AlterTable
ALTER TABLE "InboxCustomer" ADD COLUMN     "contactId" UUID;

-- CreateTable
CREATE TABLE "InboxChannelConnection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "platformId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "provider" "InboxChannelProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "businessAccountId" TEXT,
    "displayName" TEXT NOT NULL,
    "accountLabel" TEXT,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMPTZ,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "InboxChannelStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastError" TEXT,
    "lastVerifiedAt" TIMESTAMPTZ,
    "lastInboundAt" TIMESTAMPTZ,
    "connectedById" UUID NOT NULL,
    "connectedByName" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "InboxChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "secondaryPhone" TEXT,
    "email" TEXT,
    "normalizedEmail" TEXT,
    "company" TEXT,
    "jobTitle" TEXT,
    "source" "ContactSource" NOT NULL DEFAULT 'MANUAL',
    "channelHandle" TEXT,
    "ownerAccountId" UUID,
    "ownerName" TEXT NOT NULL,
    "lastActivityAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGroup" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGroupMember" (
    "contactId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "addedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" UUID NOT NULL,

    CONSTRAINT "ContactGroupMember_pkey" PRIMARY KEY ("contactId","groupId")
);

-- CreateTable
CREATE TABLE "ContactCustomField" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "normalizedLabel" TEXT NOT NULL,
    "kind" "ContactFieldKind" NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ContactCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactCustomValue" (
    "contactId" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ContactCustomValue_pkey" PRIMARY KEY ("contactId","fieldId")
);

-- CreateTable
CREATE TABLE "ContactNote" (
    "id" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "authorAccountId" UUID NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ,

    CONSTRAINT "ContactNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" UUID NOT NULL,
    "pipelineId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "accent" TEXT NOT NULL DEFAULT 'slate',
    "outcome" "LeadOutcome" NOT NULL DEFAULT 'OPEN',
    "position" INTEGER NOT NULL,
    "isEntry" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "pipelineId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "assignedAgentId" UUID,
    "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
    "valueMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "precision" INTEGER NOT NULL DEFAULT 2,
    "program" TEXT NOT NULL DEFAULT '',
    "outcome" "LeadOutcome" NOT NULL DEFAULT 'OPEN',
    "nextActionAt" TIMESTAMPTZ,
    "closedAt" TIMESTAMPTZ,
    "closeReason" TEXT,
    "deletedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "kind" "LeadActivityKind" NOT NULL,
    "label" TEXT NOT NULL,
    "actorId" UUID,
    "actorName" TEXT NOT NULL,
    "payload" JSONB,
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboxChannelConnection_organizationId_status_idx" ON "InboxChannelConnection"("organizationId", "status");

-- CreateIndex
CREATE INDEX "InboxChannelConnection_platformId_idx" ON "InboxChannelConnection"("platformId");

-- CreateIndex
CREATE INDEX "InboxChannelConnection_branchId_idx" ON "InboxChannelConnection"("branchId");

-- CreateIndex
CREATE INDEX "InboxChannelConnection_connectedById_idx" ON "InboxChannelConnection"("connectedById");

-- CreateIndex
CREATE UNIQUE INDEX "InboxChannelConnection_provider_providerAccountId_key" ON "InboxChannelConnection"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "Contact_organizationId_deletedAt_lastActivityAt_id_idx" ON "Contact"("organizationId", "deletedAt", "lastActivityAt", "id");

-- CreateIndex
CREATE INDEX "Contact_organizationId_normalizedName_idx" ON "Contact"("organizationId", "normalizedName");

-- CreateIndex
CREATE INDEX "Contact_organizationId_source_idx" ON "Contact"("organizationId", "source");

-- CreateIndex
CREATE INDEX "Contact_organizationId_branchId_idx" ON "Contact"("organizationId", "branchId");

-- CreateIndex
CREATE INDEX "Contact_ownerAccountId_idx" ON "Contact"("ownerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_organizationId_normalizedPhone_key" ON "Contact"("organizationId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "ContactGroup_organizationId_active_idx" ON "ContactGroup"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGroup_organizationId_normalizedName_key" ON "ContactGroup"("organizationId", "normalizedName");

-- CreateIndex
CREATE INDEX "ContactGroupMember_groupId_contactId_idx" ON "ContactGroupMember"("groupId", "contactId");

-- CreateIndex
CREATE INDEX "ContactCustomField_organizationId_active_displayOrder_idx" ON "ContactCustomField"("organizationId", "active", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ContactCustomField_organizationId_normalizedLabel_key" ON "ContactCustomField"("organizationId", "normalizedLabel");

-- CreateIndex
CREATE INDEX "ContactCustomValue_fieldId_idx" ON "ContactCustomValue"("fieldId");

-- CreateIndex
CREATE INDEX "ContactNote_contactId_createdAt_idx" ON "ContactNote"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactNote_authorAccountId_idx" ON "ContactNote"("authorAccountId");

-- CreateIndex
CREATE INDEX "Pipeline_organizationId_active_idx" ON "Pipeline"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Pipeline_organizationId_code_key" ON "Pipeline"("organizationId", "code");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_position_idx" ON "PipelineStage"("pipelineId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_pipelineId_code_key" ON "PipelineStage"("pipelineId", "code");

-- CreateIndex
CREATE INDEX "Lead_organizationId_deletedAt_updatedAt_id_idx" ON "Lead"("organizationId", "deletedAt", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "Lead_pipelineId_stageId_updatedAt_idx" ON "Lead"("pipelineId", "stageId", "updatedAt");

-- CreateIndex
CREATE INDEX "Lead_organizationId_assignedAgentId_idx" ON "Lead"("organizationId", "assignedAgentId");

-- CreateIndex
CREATE INDEX "Lead_organizationId_outcome_idx" ON "Lead"("organizationId", "outcome");

-- CreateIndex
CREATE INDEX "Lead_contactId_idx" ON "Lead"("contactId");

-- CreateIndex
CREATE INDEX "Lead_branchId_idx" ON "Lead"("branchId");

-- CreateIndex
CREATE INDEX "Lead_stageId_idx" ON "Lead"("stageId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_occurredAt_id_idx" ON "LeadActivity"("leadId", "occurredAt", "id");

-- CreateIndex
CREATE INDEX "InboxCustomer_contactId_idx" ON "InboxCustomer"("contactId");

-- AddForeignKey
ALTER TABLE "InboxCustomer" ADD CONSTRAINT "InboxCustomer_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxChannelConnection" ADD CONSTRAINT "InboxChannelConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxChannelConnection" ADD CONSTRAINT "InboxChannelConnection_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "InboxPlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxChannelConnection" ADD CONSTRAINT "InboxChannelConnection_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxChannelConnection" ADD CONSTRAINT "InboxChannelConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroupMember" ADD CONSTRAINT "ContactGroupMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroupMember" ADD CONSTRAINT "ContactGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCustomField" ADD CONSTRAINT "ContactCustomField_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCustomValue" ADD CONSTRAINT "ContactCustomValue_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCustomValue" ADD CONSTRAINT "ContactCustomValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "ContactCustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactNote" ADD CONSTRAINT "ContactNote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactNote" ADD CONSTRAINT "ContactNote_authorAccountId_fkey" FOREIGN KEY ("authorAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
