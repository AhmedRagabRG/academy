import type { Request } from 'express';
import { deriveSessionMetadata } from '../../../src/modules/identity/sessions/session-metadata';

const request = (userAgent?: string, ip?: string): Request =>
  ({
    ip,
    get: (name: string) =>
      name.toLowerCase() === 'user-agent' ? userAgent : undefined,
  }) as Request;

describe('deriveSessionMetadata', () => {
  it('uses bounded safe fallbacks when request metadata is absent', () => {
    expect(deriveSessionMetadata(request())).toEqual({
      device: 'Desktop device',
      browser: 'Unknown browser',
      ipAddress: 'unknown',
      userAgent: 'Unknown',
    });
  });

  it('recognizes common mobile browsers and bounds persisted values', () => {
    const metadata = deriveSessionMetadata(
      request(
        `Mozilla/5.0 iPhone Chrome/125 ${'x'.repeat(600)}`,
        '1'.repeat(80),
      ),
    );
    expect(metadata.device).toBe('Mobile device');
    expect(metadata.browser).toBe('Chrome');
    expect(metadata.userAgent).toHaveLength(512);
    expect(metadata.ipAddress).toHaveLength(64);
  });
});
