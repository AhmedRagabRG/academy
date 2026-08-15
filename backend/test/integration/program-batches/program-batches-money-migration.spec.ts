import { readFileSync } from 'node:fs';

describe('Program Batch exact money migration', () => {
  const sql = readFileSync(
    'prisma/migrations/20260803010000_program_batches/migration.sql',
    'utf8',
  );
  it('stores amounts as bigint with bounded precision', () => {
    expect(sql).toContain('"programPriceMinor" BIGINT');
    expect(sql).toContain('"registrationFeeMinor" BIGINT');
    expect(sql).toContain('"programPricePrecision" BETWEEN 0 AND 6');
  });
});
