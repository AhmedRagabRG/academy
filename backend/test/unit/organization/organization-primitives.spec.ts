import {
  isSafeFileDescriptor,
  normalizeOrganizationCode,
  normalizeOrganizationEmail,
  normalizeOrganizationSearch,
  parseDateOnly,
} from '../../../src/modules/organization/types/organization-normalization';

describe('organization primitives', () => {
  it('normalizes codes, emails, and Arabic search text', () => {
    expect(normalizeOrganizationCode(' cai ')).toBe('CAI');
    expect(normalizeOrganizationEmail(' Admin@Example.COM ')).toBe(
      'admin@example.com',
    );
    expect(normalizeOrganizationSearch('أكادِيمِيّة ٢٠٢٦')).toBe(
      'اكاديميه 2026',
    );
  });

  it('accepts exact date-only values and rejects overflow dates', () => {
    expect(parseDateOnly('2026-09-01')?.toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
    expect(parseDateOnly('2026-02-30')).toBeNull();
    expect(parseDateOnly('2026-9-1')).toBeNull();
  });

  it('accepts safe descriptors and rejects local or traversing paths', () => {
    const descriptor = {
      id: 'id',
      fileName: 'logo.png',
      originalName: 'logo.png',
      mimeType: 'image/png',
      size: 42,
      url: '/uploads/logo.png',
    };
    expect(isSafeFileDescriptor(descriptor)).toBe(true);
    expect(
      isSafeFileDescriptor({ ...descriptor, url: 'file:///tmp/a.png' }),
    ).toBe(false);
    expect(isSafeFileDescriptor({ ...descriptor, url: '/../secret' })).toBe(
      false,
    );
  });
});
