import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'src/modules/admissions');

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('Admissions architecture boundaries', () => {
  const sources = files(root).filter((path) => path.endsWith('.ts'));

  it('keeps direct Prisma access inside repository implementations', () => {
    const violations = sources
      .filter((path) => readFileSync(path, 'utf8').includes('PrismaService'))
      .filter((path) => !path.endsWith('.repository.ts'))
      .map((path) => relative(process.cwd(), path));
    expect(violations).toEqual([]);
  });

  it('does not import foreign feature repositories or filesystem APIs', () => {
    const violations = sources.flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return /from ['"].*modules\/(?!admissions)[^'"]*repository|from ['"]node:(?:fs|path)['"]/.test(
        source,
      )
        ? [relative(process.cwd(), path)]
        : [];
    });
    expect(violations).toEqual([]);
  });

  it('does not introduce explicit any types', () => {
    const violations = sources.flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return /\bas any\b|:\s*any\b|<any>/.test(source)
        ? [relative(process.cwd(), path)]
        : [];
    });
    expect(violations).toEqual([]);
  });
});
