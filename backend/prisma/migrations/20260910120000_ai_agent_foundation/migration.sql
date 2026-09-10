-- Before AI ships, every outgoing inbox message was created by
-- InboxService.sendReply with a real account id, while every incoming message
-- came from a provider webhook. Direction therefore gives a lossless author
-- backfill for all existing rows.

-- PostgreSQL 18 permits ADD VALUE in a transaction, but a new value cannot be
-- used until that transaction commits. These additions are first and neither
-- value is referenced by the remaining statements in this migration.
ALTER TYPE "InboxMessageDelivery" ADD VALUE IF NOT EXISTS 'SUPPRESSED';
ALTER TYPE "InboxMessageDelivery" ADD VALUE IF NOT EXISTS 'UNCERTAIN';

-- CreateEnum
CREATE TYPE "InboxMessageAuthor" AS ENUM ('CUSTOMER', 'HUMAN_AGENT', 'AI_AGENT');

-- CreateEnum
CREATE TYPE "AiMode" AS ENUM ('AUTO', 'PAUSED', 'OFF');

-- CreateEnum
CREATE TYPE "AiPauseReason" AS ENUM ('HUMAN_REPLY', 'MANUAL', 'ESCALATED', 'HANDOFF', 'ERROR_BUDGET');

-- CreateEnum
CREATE TYPE "AiTurnStatus" AS ENUM ('QUEUED', 'RUNNING', 'REPLIED', 'SUPPRESSED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "AiToolOutcome" AS ENUM ('SUCCESS', 'VALIDATION_ERROR', 'DENIED', 'ERROR');

-- CreateEnum
CREATE TYPE "KnowledgeSourceKind" AS ENUM ('FILE', 'TEXT', 'URL');

-- CreateEnum
CREATE TYPE "KnowledgeSourceStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "KnowledgeVisibility" AS ENUM ('CUSTOMER_FACING', 'INTERNAL');

-- AlterTable
ALTER TABLE "InboxMessage" ADD COLUMN "authorType" "InboxMessageAuthor";
-- The CASE arms are text literals; PostgreSQL will not implicitly cast them to
-- the enum on assignment, so the result is cast explicitly.
UPDATE "InboxMessage" SET "authorType" =
  (CASE WHEN direction = 'INCOMING' THEN 'CUSTOMER' ELSE 'HUMAN_AGENT' END)::"InboxMessageAuthor";
ALTER TABLE "InboxMessage" ALTER COLUMN "authorType" SET NOT NULL;
ALTER TABLE "InboxMessage" ALTER COLUMN "authorType" SET DEFAULT 'HUMAN_AGENT';
ALTER TABLE "InboxMessage" ADD COLUMN "aiTurnId" UUID;
ALTER TABLE "InboxMessage" ADD CONSTRAINT "inbox_message_ai_turn_consistent"
  CHECK (("authorType" = 'AI_AGENT') = ("aiTurnId" IS NOT NULL));

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "knowledgeBaseId" UUID NOT NULL,
    "kind" "KnowledgeSourceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "visibility" "KnowledgeVisibility" NOT NULL DEFAULT 'CUSTOMER_FACING',
    "rawText" TEXT,
    "storageId" TEXT,
    "storageName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "activeRevision" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT,
    "deletedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "systemInstructions" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "responseLanguage" TEXT NOT NULL DEFAULT 'ar',
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "maxResponseChars" INTEGER NOT NULL,
    "enabledPlatformCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workingHours" JSONB,
    "outsideHoursBehaviour" TEXT NOT NULL,
    "resumeAfterMinutes" INTEGER,
    "fallbackMessage" TEXT NOT NULL,
    "handoffMessage" TEXT NOT NULL,
    "allowedTools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedCrmFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dataCollectionFields" JSONB NOT NULL DEFAULT '[]',
    "retrievalMinScore" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "retrievalTopK" INTEGER NOT NULL DEFAULT 6,
    "routingMinConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "maxToolCallsPerTurn" INTEGER NOT NULL DEFAULT 4,
    "escalateOnFallback" BOOLEAN NOT NULL DEFAULT true,
    "serviceAccountId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgentKnowledgeBase" (
    "organizationId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "knowledgeBaseId" UUID NOT NULL,

    CONSTRAINT "AiAgentKnowledgeBase_pkey" PRIMARY KEY ("agentId", "knowledgeBaseId")
);

-- CreateTable
CREATE TABLE "AiTicketRoutingRule" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "teamId" UUID,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiTicketRoutingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationAiState" (
    "conversationId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "mode" "AiMode" NOT NULL DEFAULT 'AUTO',
    "pausedReason" "AiPauseReason",
    "pausedAt" TIMESTAMPTZ,
    "pausedByAccountId" UUID,
    "resumeAt" TIMESTAMPTZ,
    "turnSeq" INTEGER NOT NULL DEFAULT 0,
    "lastInboundMessageId" UUID,
    "collectedFields" JSONB NOT NULL DEFAULT '{}',
    "askedFields" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "summarizedThroughMessageId" UUID,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ConversationAiState_pkey" PRIMARY KEY ("conversationId")
);

-- CreateTable
CREATE TABLE "AiTurn" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "triggerMessageId" UUID,
    "turnSeqAtStart" INTEGER NOT NULL,
    "status" "AiTurnStatus" NOT NULL DEFAULT 'QUEUED',
    "skipReason" TEXT,
    "dispatchStartedAt" TIMESTAMPTZ,
    "messageId" UUID,
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "estimatedCostMicros" BIGINT,
    "retrievedChunkIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ,

    CONSTRAINT "AiTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiToolExecution" (
    "id" UUID NOT NULL,
    "aiTurnId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "outcome" "AiToolOutcome" NOT NULL,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboxMessage_conversationId_authorType_idx" ON "InboxMessage"("conversationId", "authorType");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBase_organizationId_name_key" ON "KnowledgeBase"("organizationId", "name");

-- CreateIndex
CREATE INDEX "KnowledgeSource_knowledgeBaseId_status_idx" ON "KnowledgeSource"("knowledgeBaseId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeSource_organizationId_deletedAt_idx" ON "KnowledgeSource"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiAgent_organizationId_name_key" ON "AiAgent"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AiTicketRoutingRule_agentId_category_key" ON "AiTicketRoutingRule"("agentId", "category");

-- CreateIndex
CREATE INDEX "ConversationAiState_organizationId_mode_idx" ON "ConversationAiState"("organizationId", "mode");

-- The later auto-resume sweeper only scans paused conversations that are due.
CREATE INDEX "conversation_ai_state_due" ON "ConversationAiState" ("resumeAt")
  WHERE mode = 'PAUSED' AND "resumeAt" IS NOT NULL;

-- CreateIndex
CREATE INDEX "AiTurn_conversationId_createdAt_idx" ON "AiTurn"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiTurn_organizationId_status_createdAt_idx" ON "AiTurn"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AiToolExecution_aiTurnId_idx" ON "AiToolExecution"("aiTurnId");

-- CreateIndex
CREATE INDEX "AiToolExecution_organizationId_toolName_createdAt_idx" ON "AiToolExecution"("organizationId", "toolName", "createdAt");

-- AddForeignKey
ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentKnowledgeBase" ADD CONSTRAINT "AiAgentKnowledgeBase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentKnowledgeBase" ADD CONSTRAINT "AiAgentKnowledgeBase_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgentKnowledgeBase" ADD CONSTRAINT "AiAgentKnowledgeBase_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTicketRoutingRule" ADD CONSTRAINT "AiTicketRoutingRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTicketRoutingRule" ADD CONSTRAINT "AiTicketRoutingRule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationAiState" ADD CONSTRAINT "ConversationAiState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationAiState" ADD CONSTRAINT "ConversationAiState_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTurn" ADD CONSTRAINT "AiTurn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiToolExecution" ADD CONSTRAINT "AiToolExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiToolExecution" ADD CONSTRAINT "AiToolExecution_aiTurnId_fkey" FOREIGN KEY ("aiTurnId") REFERENCES "AiTurn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
