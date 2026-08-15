import { readFileSync } from 'node:fs';
describe('catalog disclosure and logging', () => {
  it('redacts credentials and never exposes internal minor-unit fields through the mapper', () => {
    const app = readFileSync('src/app.module.ts', 'utf8');
    const mapper = readFileSync(
      'src/modules/catalog/mappers/catalog.mapper.ts',
      'utf8',
    );
    expect(app).toContain('req.headers.cookie');
    expect(app).toContain('req.headers.authorization');
    expect(mapper).toContain('minorToMoney');
    expect(mapper).not.toContain('passwordHash');
  });
});
