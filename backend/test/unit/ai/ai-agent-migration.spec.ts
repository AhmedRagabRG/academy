import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(
    __dirname,
    '../../../prisma/migrations/20260910120000_ai_agent_foundation/migration.sql',
  ),
  'utf8',
);

describe('AI agent foundation migration', () => {
  it('backfills message authors before making the column required', () => {
    const addNullable = migration.indexOf(
      'ALTER TABLE "InboxMessage" ADD COLUMN "authorType" "InboxMessageAuthor";',
    );
    const backfill = migration.indexOf(
      'UPDATE "InboxMessage" SET "authorType" =',
    );
    const setNotNull = migration.indexOf(
      'ALTER TABLE "InboxMessage" ALTER COLUMN "authorType" SET NOT NULL;',
    );
    const setDefault = migration.indexOf(
      'ALTER TABLE "InboxMessage" ALTER COLUMN "authorType" SET DEFAULT',
    );
    expect(addNullable).toBeGreaterThan(-1);
    expect(backfill).toBeGreaterThan(addNullable);
    expect(setNotNull).toBeGreaterThan(backfill);
    expect(setDefault).toBeGreaterThan(setNotNull);
    expect(migration).toContain(
      "CASE WHEN direction = 'INCOMING' THEN 'CUSTOMER' ELSE 'HUMAN_AGENT' END",
    );
    expect(migration).toContain(
      'CONSTRAINT "inbox_message_ai_turn_consistent"',
    );
    expect(migration).toContain(
      'CHECK (("authorType" = \'AI_AGENT\') = ("aiTurnId" IS NOT NULL))',
    );
  });
});
