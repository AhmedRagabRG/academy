import { isSafeFileDescriptor } from '../../../src/modules/organization/types/organization-normalization';
describe('organization disclosure safety', () => {
  it('rejects filesystem descriptors', () => {
    expect(
      isSafeFileDescriptor({
        id: '1',
        fileName: 'x',
        originalName: 'x',
        mimeType: 'image/png',
        size: 1,
        url: 'file:///tmp/secret',
      }),
    ).toBe(false);
    expect(
      isSafeFileDescriptor({
        id: '1',
        fileName: 'x',
        originalName: 'x',
        mimeType: 'image/png',
        size: 1,
        url: '../secret',
      }),
    ).toBe(false);
  });
});
