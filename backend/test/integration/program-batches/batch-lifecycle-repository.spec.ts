import { readFileSync } from 'node:fs';

describe('Batch lifecycle persistence', () => {
  const source = readFileSync(
    'src/modules/program-batches/batches/batch.repository.ts',
    'utf8',
  );
  it('uses version/status compare-and-swap and appends one event', () => {
    expect(source).toContain('version: expectedVersion');
    expect(source).toContain('status: fromStatus');
    expect(source).toContain('batchLifecycleEvent.create');
  });
});
