import { readFileSync } from 'node:fs';
describe('future consumer boundary', () => {
  it('exports public services and documents immutable snapshot ownership', () => {
    const module = readFileSync(
      'src/modules/catalog/catalog.module.ts',
      'utf8',
    );
    const docs = readFileSync('src/modules/README.md', 'utf8');
    expect(module).toContain('CATALOG_PUBLIC_PORT');
    expect(module).not.toContain('EmployeeRepository');
    expect(module).not.toContain('BranchRepository');
    expect(docs).toContain('immutable copies');
  });
});
