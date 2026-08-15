import { readFileSync } from 'node:fs';

describe('Batch operational persistence', () => {
  const source = readFileSync(
    'src/modules/program-batches/batches/batch.repository.ts',
    'utf8',
  );
  it('atomically replaces role-qualified branch assignments', () => {
    expect(source).toContain('batchBranchAssignment.deleteMany');
    expect(source).toContain('batchBranchAssignment.createMany');
    expect(source).toContain("'REGISTRATION' : 'STUDY'");
  });
});
