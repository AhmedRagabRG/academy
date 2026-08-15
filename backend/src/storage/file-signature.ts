export type SupportedMime =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const signatures: Array<{ mime: SupportedMime; bytes: number[] }> = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];
export function sniffMimeType(buffer: Buffer): SupportedMime | null {
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
  return (
    signatures.find(({ bytes }) =>
      bytes.every((byte, index) => buffer[index] === byte),
    )?.mime ?? null
  );
}
