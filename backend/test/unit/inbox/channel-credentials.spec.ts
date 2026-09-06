import { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../src/database/prisma.service';
import { ChannelCredentialsService } from '../../../src/modules/inbox/channels/channel-credentials.service';
import { ChannelCryptoService } from '../../../src/modules/inbox/channels/channel-crypto.service';

const config = new ConfigService({
  meta: {
    whatsappPhoneNumberId: 'env-phone-id',
    whatsappAccessToken: 'env-wa-token',
    messengerPageId: '',
    messengerPageAccessToken: '',
    instagramAccountId: '',
    instagramAccessToken: '',
  },
  channelSecrets: { encryptionKey: 'unit-test-key-at-least-32-characters' },
});
const crypto = new ChannelCryptoService(config);

const database = (overrides: Record<string, unknown> = {}) =>
  ({
    inboxChannelConnection: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    inboxPlatform: { findFirst: jest.fn().mockResolvedValue(null) },
    generalSettings: { findFirst: jest.fn().mockResolvedValue(null) },
    ...overrides,
  }) as unknown as PrismaService;

describe('ChannelCredentialsService', () => {
  it('prefers a linked connection over the environment fallback', async () => {
    const db = database({
      inboxChannelConnection: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'connection-id',
          provider: 'META_WHATSAPP',
          providerAccountId: 'linked-phone-id',
          businessAccountId: 'waba-id',
          accessToken: crypto.encrypt('linked-token'),
        }),
      },
    });
    const service = new ChannelCredentialsService(db, config, crypto);
    await expect(service.forPlatform('org', 'whatsapp')).resolves.toEqual({
      connectionId: 'connection-id',
      provider: 'META_WHATSAPP',
      platformCode: 'whatsapp',
      providerAccountId: 'linked-phone-id',
      accessToken: 'linked-token',
      businessAccountId: 'waba-id',
    });
  });

  it('falls back to the environment when nothing is linked', async () => {
    const service = new ChannelCredentialsService(database(), config, crypto);
    await expect(service.forPlatform('org', 'whatsapp')).resolves.toMatchObject(
      {
        providerAccountId: 'env-phone-id',
        accessToken: 'env-wa-token',
      },
    );
    await expect(service.forPlatform('org', 'instagram')).resolves.toBeNull();
    await expect(service.forPlatform('org', 'web')).resolves.toBeNull();
  });

  it('routes inbound traffic to the organization that linked the account', async () => {
    const db = database({
      inboxChannelConnection: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'connection-id',
          organizationId: 'org-1',
          platformId: 'platform-1',
          status: 'CONNECTED',
        }),
      },
    });
    const service = new ChannelCredentialsService(db, config, crypto);
    await expect(service.forInbound('instagram', 'ig-1')).resolves.toEqual({
      connectionId: 'connection-id',
      organizationId: 'org-1',
      platformId: 'platform-1',
      platformCode: 'instagram',
    });
  });

  it('refuses inbound traffic from an account nobody linked', async () => {
    const service = new ChannelCredentialsService(database(), config, crypto);
    await expect(
      service.forInbound('whatsapp', 'someone-elses-number'),
    ).resolves.toBeNull();
  });

  it('accepts the environment account when configured', async () => {
    const db = database({
      inboxPlatform: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'platform-1', organizationId: 'org-1' }),
      },
    });
    const service = new ChannelCredentialsService(db, config, crypto);
    await expect(
      service.forInbound('whatsapp', 'env-phone-id'),
    ).resolves.toMatchObject({
      organizationId: 'org-1',
      platformId: 'platform-1',
    });
  });
});
