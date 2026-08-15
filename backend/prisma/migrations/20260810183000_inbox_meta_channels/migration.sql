ALTER TABLE "InboxConversation" ADD COLUMN "providerThreadId" TEXT;
ALTER TABLE "InboxMessage" ADD COLUMN "providerMessageId" TEXT;

CREATE UNIQUE INDEX "InboxConversation_platformId_providerThreadId_key"
  ON "InboxConversation"("platformId", "providerThreadId");
CREATE UNIQUE INDEX "InboxMessage_providerMessageId_key"
  ON "InboxMessage"("providerMessageId");
