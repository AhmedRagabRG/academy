import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type { PrismaService } from '../../../src/database/prisma.service';
import { InboxRealtimeService } from '../../../src/modules/inbox/inbox-realtime.service';
import { MetaWebhookService } from '../../../src/modules/inbox/meta/meta-webhook.service';

const database = () => ({
  inboxMessage: {
    findUnique: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  inboxPlatform: {
    findFirst: jest.fn().mockResolvedValue({
      id: 'platform-id',
      organizationId: 'organization-id',
    }),
  },
  branch: {
    findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'branch-id' }),
  },
  inboxCustomer: { upsert: jest.fn().mockResolvedValue({ id: 'customer-id' }) },
  inboxConversation: {
    upsert: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
  },
});

describe('MetaWebhookService', () => {
  const config = new ConfigService({
    meta: {
      appSecret: 'app-secret',
      verifyToken: 'verify-token',
      whatsappPhoneNumberId: 'phone-id',
      messengerPageId: 'page-id',
    },
  });

  it('uses constant-time webhook signature verification and challenge token', () => {
    const service = new MetaWebhookService(
      config,
      database() as unknown as PrismaService,
      new InboxRealtimeService(),
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
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      realtime,
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
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('applies WhatsApp delivery and read receipts', async () => {
    const db = database();
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      new InboxRealtimeService(),
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
});
