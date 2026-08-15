import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'src/modules/student-finance');

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('Student Finance architecture boundaries', () => {
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
      return /from ['"].*modules\/(?!student-finance)[^'"]*repository|from ['"]node:(?:fs|path)['"]/.test(
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

  it('keeps business logic out of controllers', () => {
    // A controller binds the request, enforces authorization and calls one
    // service entry point. A money calculation there is a violation whatever
    // its size (constitution Principle IV).
    const violations = sources
      .filter((path) => path.endsWith('.controller.ts'))
      .flatMap((path) => {
        const source = readFileSync(path, 'utf8');
        return /toMinorUnits|fromMinorUnits|BigInt\(|remainingMinor|\bprisma\b/i.test(
          source,
        )
          ? [relative(process.cwd(), path)]
          : [];
      });
    expect(violations).toEqual([]);
  });

  it('derives balances in exactly one place', () => {
    // Every read path must share one derivation, or the list, the detail and
    // the dashboard can disagree about what a student owes.
    const derivers = sources
      .filter((path) =>
        /FROM finance_invoice_balance/.test(readFileSync(path, 'utf8')),
      )
      .map((path) => relative(root, path));
    expect(derivers).toEqual(['balances/finance-balance.repository.ts']);
  });
});
