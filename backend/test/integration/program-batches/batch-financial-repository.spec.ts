import { readFileSync } from 'node:fs';

describe('Batch financial persistence', () => {
  const source = readFileSync(
    'src/modules/program-batches/batches/batch.repository.ts',
    'utf8',
  );
  it('appends a complete revision and switches only the root pointer', () => {
    expect(source).toContain('batchFinancialRevision.create');
    expect(source).toContain('currentFinancialRevisionId: revisionId');
    expect(source).not.toContain('batchFinancialRevision.update');
    expect(source).not.toContain('batchFinancialRevision.delete');
  });
});
