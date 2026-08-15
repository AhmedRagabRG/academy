import { sniffMimeType } from '../../src/storage/file-signature';
describe('file signatures', () => {
  it.each([
    [Buffer.from('%PDF'), 'application/pdf'],
    [Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg'],
    [Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'image/png'],
    [
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      'application/msword',
    ],
    [
      Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.from('word/document.xml'),
      ]),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    [Buffer.from('unknown'), null],
  ])('detects %s', (buffer, expected) =>
    expect(sniffMimeType(buffer as Buffer)).toBe(expected),
  );
});
