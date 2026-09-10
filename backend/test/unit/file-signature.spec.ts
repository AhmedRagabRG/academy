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

  it('accepts valid UTF-8 text only when explicitly declared', () => {
    expect(sniffMimeType(Buffer.from('مرحبا'), 'text/plain')).toBe(
      'text/plain',
    );
    expect(sniffMimeType(Buffer.from('# Heading'), 'text/markdown')).toBe(
      'text/markdown',
    );
    expect(sniffMimeType(Buffer.from('plain but undeclared'))).toBeNull();
  });

  it('rejects invalid UTF-8 and NUL-containing files declared as text', () => {
    expect(sniffMimeType(Buffer.from([0xff, 0xfe]), 'text/plain')).toBeNull();
    expect(sniffMimeType(Buffer.from([0x61, 0x00]), 'text/plain')).toBeNull();
  });
});
