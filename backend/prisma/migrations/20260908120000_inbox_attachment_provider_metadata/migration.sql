-- Inbound webhook attachments carry only real provider metadata (no bytes
-- are fabricated), so the columns that describe locally stored bytes must
-- allow null until a deployment adds authenticated media retrieval.
ALTER TABLE "InboxMessageAttachment" ALTER COLUMN "sizeBytes" DROP NOT NULL;
ALTER TABLE "InboxMessageAttachment" ALTER COLUMN "storageKey" DROP NOT NULL;
ALTER TABLE "InboxMessageAttachment" ALTER COLUMN "ownerAccountId" DROP NOT NULL;
