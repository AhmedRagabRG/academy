-- DropIndex
DROP INDEX "Ticket_organizationId_archivedAt_priorityRank_updatedAt_id_idx";

-- DropIndex
DROP INDEX "Ticket_organizationId_archivedAt_status_updatedAt_id_idx";

-- CreateIndex
CREATE INDEX "Ticket_organizationId_archivedAt_status_updatedAt_id_idx" ON "Ticket"("organizationId", "archivedAt", "status", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "Ticket_organizationId_archivedAt_priorityRank_updatedAt_id_idx" ON "Ticket"("organizationId", "archivedAt", "priorityRank", "updatedAt", "id");

-- RenameIndex
ALTER INDEX "InboxStagedAttachment_organizationId_ownerAccountId_consumed_id" RENAME TO "InboxStagedAttachment_organizationId_ownerAccountId_consume_idx";
