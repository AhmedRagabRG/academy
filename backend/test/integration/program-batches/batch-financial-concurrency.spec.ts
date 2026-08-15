import { readFileSync } from 'node:fs';

describe('Batch financial concurrency', () => {
  it('uses serializable transactions and source-version uniqueness', () => {
    const service = readFileSync(
      'src/modules/program-batches/batches/batch.service.ts',
      'utf8',
    );
    const migration = readFileSync(
      'prisma/migrations/20260803010000_program_batches/migration.sql',
      'utf8',
    );
    expect(service).toContain('runSerializable');
    expect(migration).toContain(
      'BatchFinancialRevision_batchId_sourceBatchVersion_key',
    );
  });
});
