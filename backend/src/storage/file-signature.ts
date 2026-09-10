export type SupportedMime =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain'
  | 'text/markdown'
  | 'text/x-markdown';
const signatures: Array<{ mime: SupportedMime; bytes: number[] }> = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];
const TEXT_MIMES = new Set<SupportedMime>([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]);

export function sniffMimeType(
  buffer: Buffer,
  declaredMimeType?: string,
): SupportedMime | null {
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
  )
    return 'application/msword';
  if (
    buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) &&
    buffer.includes(Buffer.from('word/'))
  )
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const signature =
    signatures.find(({ bytes }) =>
      bytes.every((byte, index) => buffer[index] === byte),
    )?.mime ?? null;
  if (signature) return signature;

  // Plain text and Markdown have no reliable magic bytes. Only accept an
  // explicitly declared text type whose bytes are valid UTF-8 and contain no
  // NULs, rather than treating every unrecognised binary as text.
  if (TEXT_MIMES.has(declaredMimeType as SupportedMime)) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      return buffer.includes(0) ? null : (declaredMimeType as SupportedMime);
    } catch {
      return null;
    }
  }
  return null;
}
