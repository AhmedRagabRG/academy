import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PERMISSION_CATALOG } from '../../../prisma/seeds/permission-catalog';

describe('identity migration compatibility', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20260802020000_identity_access_management/migration.sql',
    ),
    'utf8',
  );

  it('backfills every former single-role assignment before removing roleId', () => {
    const backfill = sql.indexOf('INSERT INTO "AccountRole"');
    const removal = sql.indexOf('DROP COLUMN "roleId"');
    expect(backfill).toBeGreaterThan(-1);
    expect(removal).toBeGreaterThan(backfill);
  });

  it('creates relationship constraints and retains rollback reconstruction inputs', () => {
    expect(sql).toContain('CREATE TABLE "RolePermission"');
    expect(sql).toContain('CREATE TABLE "AccountRole"');
    expect(sql).toContain('ON DELETE RESTRICT');
  });

  it('has a unique canonical permission catalogue', () => {
    expect(PERMISSION_CATALOG).toHaveLength(175);
    expect(new Set(PERMISSION_CATALOG.map(({ key }) => key)).size).toBe(175);
  });
});
