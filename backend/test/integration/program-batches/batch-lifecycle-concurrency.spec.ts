import { readFileSync } from 'node:fs';

describe('Batch lifecycle concurrency', () => {
  it('has one database uniqueness winner per resulting version', () => {
    const sql = readFileSync(
      'prisma/migrations/20260803010000_program_batches/migration.sql',
      'utf8',
    );
    expect(sql).toContain('BatchLifecycleEvent_batchId_resultingVersion_key');
  });
});
