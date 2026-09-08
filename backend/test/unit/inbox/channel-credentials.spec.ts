import { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../src/database/prisma.service';
import { ChannelCredentialsService } from '../../../src/modules/inbox/channels/channel-credentials.service';

const config = new ConfigService({
  meta: {
    whatsappPhoneNumberId: 'env-phone-id',
    whatsappAccessToken: 'env-wa-token',
    whatsappBusinessAccountId: 'env-waba-id',
    messengerPageId: '',
    messengerPageAccessToken: '',
    instagramAccountId: '',
    instagramAccessToken: '',
  },
});

const database = (overrides: Record<string, unknown> = {}) =>
  ({
    inboxPlatform: { findFirst: jest.fn().mockResolvedValue(null) },
    ...overrides,
  }) as unknown as PrismaService;

describe('ChannelCredentialsService', () => {
  it('resolves send credentials, including the business account id, only from environment configuration', async () => {
    const service = new ChannelCredentialsService(database(), config);
    await expect(service.forPlatform('org', 'whatsapp')).resolves.toEqual({
      platformCode: 'whatsapp',
      providerAccountId: 'env-phone-id',
      accessToken: 'env-wa-token',
      businessAccountId: 'env-waba-id',
    });
  });

  it('returns null for an unconfigured or unknown platform code', async () => {
    const service = new ChannelCredentialsService(database(), config);
    await expect(service.forPlatform('org', 'instagram')).resolves.toBeNull();
    await expect(service.forPlatform('org', 'web')).resolves.toBeNull();
  });

  it('routes inbound traffic to the environment-configured platform', async () => {
    const db = database({
      inboxPlatform: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'platform-1', organizationId: 'org-1' }),
      },
    });
    const service = new ChannelCredentialsService(db, config);
    await expect(
      service.forInbound('whatsapp', 'env-phone-id'),
    ).resolves.toEqual({
      organizationId: 'org-1',
      platformId: 'platform-1',
      platformCode: 'whatsapp',
    });
  });

  it('rejects inbound traffic whose provider account id does not match the configured account', async () => {
    const db = database({
      inboxPlatform: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'platform-1', organizationId: 'org-1' }),
      },
    });
    const service = new ChannelCredentialsService(db, config);
    await expect(
      service.forInbound('whatsapp', 'someone-elses-number'),
    ).resolves.toBeNull();
  });

  it('rejects inbound traffic for a platform with no environment configuration', async () => {
    const service = new ChannelCredentialsService(database(), config);
    await expect(service.forInbound('instagram', 'ig-1')).resolves.toBeNull();
  });
});
