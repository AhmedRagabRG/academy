import { readFileSync } from 'node:fs';

describe('Batch query scale safeguards', () => {
  it('has list filter indexes and a hard page-size bound', () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const source = readFileSync(
      'src/modules/program-batches/batches/batch.repository.ts',
      'utf8',
    );
    expect(schema).toContain('@@index([programId, status, updatedAt])');
    expect(schema).toContain('@@index([academicYearId, status])');
    expect(source).toContain('Math.min(query.pageSize ?? 20, 100)');
  });
});
