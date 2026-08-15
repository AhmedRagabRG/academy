import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'prisma/migrations/20260803010000_program_batches/migration.sql',
  'utf8',
);

describe('Program Batches migration', () => {
  it.each([
    'ProgramBatch_programId_code_key',
    'BatchLifecycleEvent_batchId_resultingVersion_key',
    'ProgramBatch_capacity_check',
    'reject_batch_history_mutation',
  ])('contains %s', (name) => expect(migration).toContain(name));

  it('uses restrictive foreign keys for historical aggregates', () => {
    expect(migration).toContain('ON DELETE RESTRICT');
    expect(migration).not.toContain('ProgramBatch"("id") ON DELETE CASCADE');
  });
});
