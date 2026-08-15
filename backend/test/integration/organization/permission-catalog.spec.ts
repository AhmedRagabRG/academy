import { PERMISSION_CATALOG } from '../../../prisma/seeds/permission-catalog';

describe('organization permission catalogue', () => {
  it('contains exactly the amended organization-owned keys', () => {
    const keys = PERMISSION_CATALOG.map((x) => x.key).filter((x) =>
      x.startsWith('settings.'),
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'settings.organization.view',
        'settings.organization.update',
        'settings.lookups.view',
        'settings.lookups.create',
        'settings.lookups.update',
      ]),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
