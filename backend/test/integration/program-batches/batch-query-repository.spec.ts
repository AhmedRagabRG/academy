import { readFileSync } from 'node:fs';

describe('Batch query repository contract', () => {
  const source = readFileSync(
    'src/modules/program-batches/batches/batch.repository.ts',
    'utf8',
  );
  it('implements parent scoping, stable tie breaking, paging, and archived defaults', () => {
    expect(source).toContain('programId,');
    expect(source).toContain("{ id: 'asc' }");
    expect(source).toContain('Math.min(query.pageSize ?? 20, 100)');
    expect(source).toContain("status: { not: 'ARCHIVED' }");
  });
});
