import {
  CurrentSessionException,
  NotFoundException,
} from '../../../src/core/exceptions';
import { SessionService } from '../../../src/modules/identity/sessions/session.service';

describe('session descriptor and revocation contract', () => {
  const now = Date.now();
  const record = (id: string, activity: number) => ({
    id,
    device: 'Desktop',
    browser: 'Chrome',
    ipAddress: '127.0.0.1',
    createdAt: new Date(now - 1000),
    lastActivityAt: new Date(activity),
    expiresAt: new Date(now + 60_000),
  });
  it('returns safe descriptors current-first then by activity', async () => {
    const service = new SessionService({
      list: jest
        .fn()
        .mockResolvedValue([
          record('older', now - 500),
          record('current', now - 1000),
          record('newer', now),
        ]),
    } as never);
    const result = await service.list('account', 'current');
    expect(result.map(({ id }) => id)).toEqual(['current', 'newer', 'older']);
    expect(JSON.stringify(result)).not.toMatch(/token|hash|userAgent/i);
  });
  it('uses explicit current and non-disclosing unknown errors', async () => {
    const service = new SessionService({
      findValid: jest.fn().mockResolvedValue(null),
    } as never);
    await expect(
      service.revoke('a', 'current', 'current'),
    ).rejects.toBeInstanceOf(CurrentSessionException);
    await expect(
      service.revoke('a', 'current', 'unknown'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
