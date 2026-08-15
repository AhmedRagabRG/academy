import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('academic catalog migration', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20260802230000_academic_catalog/migration.sql',
    ),
    'utf8',
  );
  it('defines fixed identities and aggregate constraints', () => {
    expect(sql).toContain(
      "'PROFESSIONAL_PROGRAM','PROFESSIONAL_DIPLOMA','TRAINING_COURSE'",
    );
    expect(sql).toContain('ProductPricing_nonnegative');
    expect(sql).toContain('ProductAsset_one_primary');
    expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED');
  });
  it('uses restrictive lifecycle and type relationships', () => {
    expect(sql).toContain('ProductLifecycleEvent_productId_fkey');
    expect(sql).toContain('ON DELETE RESTRICT');
  });
});
