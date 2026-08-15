import { readFileSync } from 'node:fs';

describe('Program Batches seed', () => {
  const source = readFileSync('prisma/seeds/program-batches.ts', 'utf8');
  it('is idempotent and supplies intake, program, and batch fixtures', () => {
    expect(source).toContain('lookupGroup.upsert');
    expect(source).toContain('lookupValue.upsert');
    expect(source).toContain('academicProduct.upsert');
    expect(source).toContain('if (!existingBatch)');
  });
});
