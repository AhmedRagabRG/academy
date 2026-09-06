import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type { PrismaService } from '../../../src/database/prisma.service';
import type { ChannelCredentialsService } from '../../../src/modules/inbox/channels/channel-credentials.service';
import type { InboxCrmLinkService } from '../../../src/modules/inbox/crm/inbox-crm-link.service';
import { InboxRealtimeService } from '../../../src/modules/inbox/inbox-realtime.service';
import { MetaWebhookService } from '../../../src/modules/inbox/meta/meta-webhook.service';

const database = () => ({
  inboxMessage: {
    findUnique: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  inboxPlatform: {
    findUnique: jest.fn().mockResolvedValue({ label: 'ماسنجر' }),
  },
  inboxCustomer: {
    upsert: jest
      .fn()
      .mockResolvedValue({ id: 'customer-id' }),
  },
  inboxConversation: {
    upsert: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
  },
});

const channels = (route: Record<string, unknown> | null) => {
  const forInbound = jest.fn().mockResolvedValue(route);
  const markInbound = jest.fn().mockResolvedValue(undefined);
  return {
    forInbound,
    markInbound,
    service: {
      forInbound,
      markInbound,
    } as unknown as ChannelCredentialsService,
  };
};

const crm = () => {
  const link = jest.fn().mockResolvedValue(undefined);
  return { link, service: { link } as unknown as InboxCrmLinkService };
};

/** The webhook publishes provider receipts; the tests only need a sink. */
const emitter = () =>
  ({ emit: jest.fn() }) as unknown as EventEmitter2;

const messengerRoute = {
  connectionId: 'connection-id',
  organizationId: 'organization-id',
  platformId: 'platform-id',
  platformCode: 'messenger',
};

describe('MetaWebhookService', () => {
  const config = new ConfigService({
    meta: { appSecret: 'app-secret', verifyToken: 'verify-token' },
  });

  it('uses constant-time webhook signature verification and challenge token', () => {
    const service = new MetaWebhookService(
      config,
      database() as unknown as PrismaService,
      new InboxRealtimeService(),
      channels(messengerRoute).service,
      crm().service,
      emitter(),
    );
    const body = Buffer.from('{"object":"page"}');
    const signature = `sha256=${createHmac('sha256', 'app-secret').update(body).digest('hex')}`;
    expect(service.verifyChallenge('subscribe', 'verify-token')).toBe(true);
    expect(service.verifyChallenge('subscribe', 'wrong')).toBe(false);
    expect(service.verifySignature(body, signature)).toBe(true);
    expect(service.verifySignature(body, 'sha256=bad')).toBe(false);
  });

  it('persists Messenger messages idempotently against the provider message id', async () => {
    const db = database();
    const realtime = new InboxRealtimeService();
    const publish = jest.spyOn(realtime, 'publish');
    const link = crm();
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      realtime,
      channels(messengerRoute).service,
      link.service,
      emitter(),
    );
    await service.ingest({
      object: 'page',
      entry: [
        {
          id: 'page-id',
          messaging: [
            {
              sender: { id: 'psid-1' },
              timestamp: 1_786_333_200_000,
              message: { mid: 'mid-1', text: 'مرحبا' },
            },
          ],
        },
      ],
    });
    expect(db.inboxMessage.findUnique).toHaveBeenCalledWith({
      where: { providerMessageId: 'mid-1' },
      select: { id: true },
    });
    expect(db.inboxConversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          platformId_providerThreadId: {
            platformId: 'platform-id',
            providerThreadId: 'psid-1',
          },
        },
      }),
    );
    expect(link.link).toHaveBeenCalledWith(
      expect.objectContaining({
        platformCode: 'messenger',
        phone: 'psid-1',
        identity: 'messenger:psid-1',
      }),
    );
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('persists Instagram direct messages on the instagram platform', async () => {
    const db = database();
    const route = { ...messengerRoute, platformCode: 'instagram' };
    const resolver = channels(route);
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      new InboxRealtimeService(),
      resolver.service,
      crm().service,
      emitter(),
    );
    await service.ingest({
      object: 'instagram',
      entry: [
        {
          id: 'ig-account-id',
          messaging: [
            {
              sender: { id: 'igsid-1' },
              timestamp: 1_786_333_200_000,
              message: { mid: 'ig-mid-1', text: 'أهلاً' },
            },
          ],
        },
      ],
    });
    expect(resolver.forInbound).toHaveBeenCalledWith(
      'instagram',
      'ig-account-id',
    );
    expect(db.inboxCustomer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_normalizedPhone: {
            organizationId: 'organization-id',
            normalizedPhone: 'instagram:igsid-1',
          },
        },
      }),
    );
  });

  it('ignores echo messages the page itself sent', async () => {
    const db = database();
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      new InboxRealtimeService(),
      channels(messengerRoute).service,
      crm().service,
      emitter(),
    );
    await service.ingest({
      object: 'page',
      entry: [
        {
          id: 'page-id',
          messaging: [
            {
              sender: { id: 'page-id' },
              message: { mid: 'mid-echo', text: 'رد', is_echo: true },
            },
          ],
        },
      ],
    });
    expect(db.inboxConversation.upsert).not.toHaveBeenCalled();
  });

  it('drops messages for an account that is not linked', async () => {
    const db = database();
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      new InboxRealtimeService(),
      channels(null).service,
      crm().service,
      emitter(),
    );
    await service.ingest({
      object: 'page',
      entry: [
        {
          id: 'unknown-page',
          messaging: [
            {
              sender: { id: 'psid-9' },
              message: { mid: 'mid-9', text: 'مرحبا' },
            },
          ],
        },
      ],
    });
    expect(db.inboxConversation.upsert).not.toHaveBeenCalled();
  });

  it('applies WhatsApp delivery and read receipts', async () => {
    const db = database();
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      new InboxRealtimeService(),
      channels(messengerRoute).service,
      crm().service,
      emitter(),
    );
    await service.ingest({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: 'wamid-1', status: 'read' }] } },
          ],
        },
      ],
    });
    expect(db.inboxMessage.updateMany).toHaveBeenCalledWith({
      where: { providerMessageId: 'wamid-1' },
      data: { delivery: 'READ' },
    });
  });

  it('marks Instagram reads by message id', async () => {
    const db = database();
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      new InboxRealtimeService(),
      channels({ ...messengerRoute, platformCode: 'instagram' }).service,
      crm().service,
      emitter(),
    );
    await service.ingest({
      object: 'instagram',
      entry: [
        {
          id: 'ig-account-id',
          messaging: [{ sender: { id: 'igsid-1' }, read: { mid: 'ig-mid-1' } }],
        },
      ],
    });
    expect(db.inboxMessage.updateMany).toHaveBeenCalledWith({
      where: { providerMessageId: 'ig-mid-1' },
      data: { delivery: 'READ' },
    });
  });
});
