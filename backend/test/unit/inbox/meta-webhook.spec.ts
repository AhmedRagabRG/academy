import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { Prisma } from '../../../prisma/generated/client';
import type { PrismaService } from '../../../src/database/prisma.service';
import type { ChannelCredentialsService } from '../../../src/modules/inbox/channels/channel-credentials.service';
import type { InboxCrmLinkService } from '../../../src/modules/inbox/crm/inbox-crm-link.service';
import { InboxRealtimeService } from '../../../src/modules/inbox/inbox-realtime.service';
import { MetaWebhookService } from '../../../src/modules/inbox/meta/meta-webhook.service';

/**
 * `$transaction` runs the callback against the same mock so nested writes
 * (`tx.inboxCustomer`, `tx.inboxConversation`) are observable on `db`
 * exactly like the non-transactional mock this file used to expose.
 */
const database = () => {
  const db: Record<string, unknown> = {
    inboxMessage: {
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    inboxPlatform: {
      findUnique: jest.fn().mockResolvedValue({ label: 'ماسنجر' }),
    },
    inboxCustomer: {
      upsert: jest.fn().mockResolvedValue({ id: 'customer-id' }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    inboxConversation: {
      upsert: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
    },
  };
  db.$transaction = jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
    callback(db),
  );
  return db;
};

const duplicateProviderMessageError = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['providerMessageId'] },
  });

const channels = (route: Record<string, unknown> | null) => {
  const forInbound = jest.fn().mockResolvedValue(route);
  return {
    forInbound,
    service: { forInbound } as unknown as ChannelCredentialsService,
  };
};

const crm = () => {
  const link = jest.fn().mockResolvedValue(undefined);
  return { link, service: { link } as unknown as InboxCrmLinkService };
};

/** The webhook publishes provider receipts; the tests only need a sink. */
const emitter = () => ({ emit: jest.fn() }) as unknown as EventEmitter2;

const messengerRoute = {
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

  it('persists Messenger messages inside one transaction keyed on the provider message id', async () => {
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
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    const conversationUpsert = (db.inboxConversation as { upsert: jest.Mock })
      .upsert;
    const conversationWrite =
      // Jest exposes call arguments as `any`; narrow the inspected boundary.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      conversationUpsert.mock.calls[0]?.[0] as unknown as {
        where: {
          platformId_providerThreadId: {
            platformId: string;
            providerThreadId: string;
          };
        };
        update: { messages: { create: { providerMessageId: string } } };
      };
    expect(conversationWrite.where.platformId_providerThreadId).toEqual({
      platformId: 'platform-id',
      providerThreadId: 'psid-1',
    });
    expect(conversationWrite.update.messages.create.providerMessageId).toBe(
      'mid-1',
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

  it('recovers the committed customer and still links the loser of a concurrent duplicate insert', async () => {
    const db = database();
    (
      db.inboxConversation as { upsert: jest.Mock }
    ).upsert.mockRejectedValueOnce(duplicateProviderMessageError());
    (db.inboxMessage as { findUnique: jest.Mock }).findUnique.mockResolvedValue(
      {
        conversation: {
          customerId: 'customer-id',
          organizationId: 'organization-id',
          platformId: 'platform-id',
          providerThreadId: 'psid-1',
        },
      },
    );
    const link = crm();
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      new InboxRealtimeService(),
      channels(messengerRoute).service,
      link.service,
      emitter(),
    );
    const payload = {
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
    };
    // Two overlapping deliveries of the same webhook race the same insert;
    // neither may throw, and both must still end up linking the CRM contact
    // (the winner from its own write, the loser by recovering the customer
    // the winner just committed) rather than only one of the two.
    await expect(
      Promise.all([service.ingest(payload), service.ingest(payload)]),
    ).resolves.toBeDefined();
    expect(link.link).toHaveBeenCalledTimes(2);
    expect(link.link).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-id' }),
    );
    // The message write itself is attempted exactly once per delivery; the
    // duplicate is never retried into a second conversation/message write.
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });

  it('repairs a stranded CRM link when a retry finds an already-committed duplicate message', async () => {
    const db = database();
    // Simulates a retry arriving after the original delivery's transaction
    // committed (customer + conversation + message all persisted) but the
    // CRM link that runs after it never completed — a crash, a timeout, or
    // Meta retrying before the response landed.
    (db.inboxConversation as { upsert: jest.Mock }).upsert.mockRejectedValue(
      duplicateProviderMessageError(),
    );
    (db.inboxMessage as { findUnique: jest.Mock }).findUnique.mockResolvedValue(
      {
        conversation: {
          customerId: 'already-committed-customer',
          organizationId: 'organization-id',
          platformId: 'platform-id',
          providerThreadId: 'psid-1',
        },
      },
    );
    const link = crm();
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      new InboxRealtimeService(),
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
    expect(
      (db.inboxMessage as { findUnique: jest.Mock }).findUnique,
    ).toHaveBeenCalledWith({
      where: { providerMessageId: 'mid-1' },
      select: {
        conversation: {
          select: {
            customerId: true,
            organizationId: true,
            platformId: true,
            providerThreadId: true,
          },
        },
      },
    });
    expect(link.link).toHaveBeenCalledTimes(1);
    expect(link.link).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'organization-id',
        customerId: 'already-committed-customer',
        identity: 'messenger:psid-1',
        platformCode: 'messenger',
      }),
    );
    // No second message write was ever attempted; only the exact-message
    // lookup used to repair the link ran outside the failed transaction.
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not repair CRM when a duplicate cannot be correlated to its exact route', async () => {
    const db = database();
    (db.inboxConversation as { upsert: jest.Mock }).upsert.mockRejectedValue(
      duplicateProviderMessageError(),
    );
    (db.inboxMessage as { findUnique: jest.Mock }).findUnique.mockResolvedValue(
      {
        conversation: {
          customerId: 'other-customer',
          organizationId: 'other-organization',
          platformId: 'platform-id',
          providerThreadId: 'psid-1',
        },
      },
    );
    const link = crm();
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      new InboxRealtimeService(),
      channels(messengerRoute).service,
      link.service,
      emitter(),
    );
    await expect(
      service.ingest({
        object: 'page',
        entry: [
          {
            id: 'page-id',
            messaging: [
              {
                sender: { id: 'psid-1' },
                message: { mid: 'mid-1', text: 'مرحبا' },
              },
            ],
          },
        ],
      }),
    ).resolves.toBeUndefined();
    expect(link.link).not.toHaveBeenCalled();
  });

  it('re-throws database errors unrelated to a duplicate provider message', async () => {
    const db = database();
    const unrelated = new Prisma.PrismaClientKnownRequestError('boom', {
      code: 'P2003',
      clientVersion: 'test',
    });
    (
      db.inboxConversation as { upsert: jest.Mock }
    ).upsert.mockRejectedValueOnce(unrelated);
    const service = new MetaWebhookService(
      config,
      db as unknown as PrismaService,
      new InboxRealtimeService(),
      channels(messengerRoute).service,
      crm().service,
      emitter(),
    );
    await expect(
      service.ingest({
        object: 'page',
        entry: [
          {
            id: 'page-id',
            messaging: [
              {
                sender: { id: 'psid-1' },
                message: { mid: 'mid-1', text: 'مرحبا' },
              },
            ],
          },
        ],
      }),
    ).rejects.toBe(unrelated);
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
    expect(
      (db.inboxCustomer as { upsert: jest.Mock }).upsert,
    ).toHaveBeenCalledWith(
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
    expect(
      (db.inboxConversation as { upsert: jest.Mock }).upsert,
    ).not.toHaveBeenCalled();
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
    expect(
      (db.inboxConversation as { upsert: jest.Mock }).upsert,
    ).not.toHaveBeenCalled();
  });

  it('captures WhatsApp image media as a real, unfabricated attachment', async () => {
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
            {
              value: {
                metadata: { phone_number_id: 'phone-id' },
                contacts: [{ profile: { name: 'أحمد' } }],
                messages: [
                  {
                    id: 'wamid-image-1',
                    from: '201000000001',
                    type: 'image',
                    timestamp: '1786333200',
                    image: {
                      id: 'media-1',
                      mime_type: 'image/jpeg',
                      caption: 'شوف الصورة دي',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const conversationUpsert = (db.inboxConversation as { upsert: jest.Mock })
      .upsert;
    const conversationWrite =
      // Jest exposes call arguments as `any`; narrow the inspected boundary.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      conversationUpsert.mock.calls[0]?.[0] as unknown as {
        update: {
          messages: {
            create: {
              body: string;
              attachments: { create: Array<Record<string, string>> };
            };
          };
        };
      };
    expect(conversationWrite.update.messages.create).toMatchObject({
      body: 'شوف الصورة دي',
      attachments: {
        create: [
          {
            sourceId: 'media-1',
            kind: 'image',
            fileName: 'photo.jpg',
          },
        ],
      },
    });
  });

  it('captures a Messenger file attachment url without downloading bytes', async () => {
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
              sender: { id: 'psid-2' },
              timestamp: 1_786_333_200_000,
              message: {
                mid: 'mid-file-1',
                attachments: [
                  {
                    type: 'file',
                    payload: {
                      url: 'https://cdn.example/file.pdf',
                      name: 'registration-proof.pdf',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const conversationUpsert = (db.inboxConversation as { upsert: jest.Mock })
      .upsert;
    const conversationWrite =
      // Jest exposes call arguments as `any`; narrow the inspected boundary.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      conversationUpsert.mock.calls[0]?.[0] as unknown as {
        update: {
          messages: {
            create: { attachments: { create: Array<Record<string, string>> } };
          };
        };
      };
    expect(conversationWrite.update.messages.create.attachments.create).toEqual(
      [
        {
          sourceId: 'https://cdn.example/file.pdf',
          kind: 'document',
          fileName: 'registration-proof.pdf',
        },
      ],
    );
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
    expect(
      (db.inboxMessage as { updateMany: jest.Mock }).updateMany,
    ).toHaveBeenCalledWith({
      where: {
        providerMessageId: 'wamid-1',
        delivery: { notIn: ['READ'] },
      },
      data: { delivery: 'READ' },
    });
  });

  it('does not regress a READ message back to DELIVERED on an out-of-order receipt', async () => {
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
            { value: { statuses: [{ id: 'wamid-2', status: 'delivered' }] } },
          ],
        },
      ],
    });
    expect(
      (db.inboxMessage as { updateMany: jest.Mock }).updateMany,
    ).toHaveBeenCalledWith({
      where: {
        providerMessageId: 'wamid-2',
        delivery: { notIn: ['DELIVERED', 'READ'] },
      },
      data: { delivery: 'DELIVERED' },
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
    expect(
      (db.inboxMessage as { updateMany: jest.Mock }).updateMany,
    ).toHaveBeenCalledWith({
      where: {
        providerMessageId: 'ig-mid-1',
        delivery: { notIn: ['READ'] },
      },
      data: { delivery: 'READ' },
    });
  });
});
