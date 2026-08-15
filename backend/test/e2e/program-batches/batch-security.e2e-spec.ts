import { readFileSync } from 'node:fs';

describe('Program Batch security boundaries', () => {
  it('does not import foreign repositories into the module', () => {
    const files = [
      'src/modules/program-batches/batches/batch.service.ts',
      'src/modules/program-batches/batches/batch.repository.ts',
    ];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/catalog\/.*repository/);
      expect(source).not.toMatch(/organization\/.*repository/);
    }
  });
});
