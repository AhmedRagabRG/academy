import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Inbox migration contract', () => {
  const sql = readFileSync(
    join(process.cwd(), 'prisma/migrations/20260810120000_inbox/migration.sql'),
    'utf8',
  );
  it('persists the complete aggregate and immutable histories', () => {
    for (const table of [
      'InboxConversation',
      'InboxCustomer',
      'InboxPlatform',
      'InboxMessage',
      'InboxMessageAttachment',
      'InboxStagedAttachment',
      'InboxInternalNote',
      'InboxConversationTag',
      'InboxAssignmentHistory',
      'InboxSystemEvent',
    ])
      expect(sql).toContain(`CREATE TABLE "${table}"`);
  });
  it('enforces reply idempotency and scoped query indexes', () => {
    expect(sql).toContain('InboxMessage_conversationId_retryToken_key');
    expect(sql).toContain(
      'InboxConversation_organizationId_assignedEmployeeId',
    );
    expect(sql).toContain('InboxConversation_organizationId_assignedTeamId');
    expect(sql).toContain('InboxCustomer_organizationId_branchId');
  });
});
