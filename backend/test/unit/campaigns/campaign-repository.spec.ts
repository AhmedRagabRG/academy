import { CampaignRepository } from '../../../src/modules/campaigns/campaign.repository';
import type { PrismaService } from '../../../src/database/prisma.service';
import { DomainException } from '../../../src/core/exceptions';

describe('CampaignRepository cursor contract', () => {
  const repository = new CampaignRepository({} as PrismaService);

  it('keeps the query fingerprint stable when only the cursor changes', () => {
    const first = repository.fingerprint({
      search: ' سبتمبر ',
      status: 'running',
      templateId: undefined,
      cursor: undefined,
      limit: 25,
    });
    const next = repository.fingerprint({
      search: ' سبتمبر ',
      status: 'running',
      templateId: undefined,
      cursor: 'opaque-next-page',
      limit: 25,
    });

    expect(next).toBe(first);
  });

  it('rejects a cursor when its filters no longer match', () => {
    const fingerprint = repository.fingerprint({
      search: '',
      status: 'running',
      cursor: undefined,
      limit: 25,
    });
    const cursor = repository.encode({
      v: 1,
      fingerprint,
      id: 'campaign-id',
      snapshotAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    const changed = repository.fingerprint({
      search: '',
      status: 'paused',
      cursor,
      limit: 25,
    });

    expect(() => repository.decode(cursor, changed)).toThrow(DomainException);
  });
});
