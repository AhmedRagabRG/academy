import { readFileSync } from 'node:fs';

describe('Program Batch financial HTTP contract', () => {
  it('exposes history as GET-only', () => {
    const source = readFileSync(
      'src/modules/program-batches/batches/batch-consumer.controller.ts',
      'utf8',
    );
    expect(source).toContain("@Get(':batchId/financial-revisions')");
    expect(source).not.toContain("@Patch(':batchId/financial-revisions')");
  });
});
