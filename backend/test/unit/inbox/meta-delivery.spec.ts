import { ConfigService } from '@nestjs/config';
import { MetaInboxDeliveryAdapter } from '../../../src/modules/inbox/delivery/meta-inbox-delivery.adapter';
import type { ChannelCredentialsService } from '../../../src/modules/inbox/channels/channel-credentials.service';

const ORGANIZATION = 'organization-id';

const credentials = (
  overrides: Record<string, { providerAccountId: string; accessToken: string }>,
) =>
  ({
    forPlatform: jest.fn((_organizationId: string, code: string) => {
      const match = overrides[code];
      return Promise.resolve(
        match
          ? {
              provider: 'META_WHATSAPP',
              platformCode: code,
              providerAccountId: match.providerAccountId,
              accessToken: match.accessToken,
            }
          : null,
      );
    }),
  }) as unknown as ChannelCredentialsService;

describe('MetaInboxDeliveryAdapter', () => {
  const config = new ConfigService({ meta: { graphVersion: 'v23.0' } });

  afterEach(() => jest.restoreAllMocks());

  it('sends WhatsApp text through the linked phone number', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid-1' }] }), {
        status: 200,
      }),
    );
    const adapter = new MetaInboxDeliveryAdapter(
      config,
      credentials({
        whatsapp: { providerAccountId: 'phone-id', accessToken: 'wa-token' },
      }),
    );
    await expect(
      adapter.enqueue({
        organizationId: ORGANIZATION,
        conversationId: 'conversation',
        messageId: 'message',
        platformCode: 'whatsapp',
        recipientId: '201000000000',
        body: 'مرحبا',
      }),
    ).resolves.toEqual({ state: 'sent', providerReference: 'wamid-1' });
    expect(fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v23.0/phone-id/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends Messenger text as a page response', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ message_id: 'mid-1' }), { status: 200 }),
      );
    const adapter = new MetaInboxDeliveryAdapter(
      config,
      credentials({
        messenger: { providerAccountId: 'page-id', accessToken: 'page-token' },
      }),
    );
    await expect(
      adapter.enqueue({
        organizationId: ORGANIZATION,
        conversationId: 'conversation',
        messageId: 'message',
        platformCode: 'messenger',
        recipientId: 'psid-1',
        body: 'مرحبا',
      }),
    ).resolves.toEqual({ state: 'sent', providerReference: 'mid-1' });
    const body = JSON.parse(
      (jest.mocked(fetch).mock.calls[0][1]?.body as string) ?? '{}',
    ) as Record<string, unknown>;
    expect(body.messaging_type).toBe('RESPONSE');
  });

  it('sends Instagram text through the linked professional account', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message_id: 'ig-mid-1' }), {
        status: 200,
      }),
    );
    const adapter = new MetaInboxDeliveryAdapter(
      config,
      credentials({
        instagram: { providerAccountId: 'ig-id', accessToken: 'ig-token' },
      }),
    );
    await expect(
      adapter.enqueue({
        organizationId: ORGANIZATION,
        conversationId: 'conversation',
        messageId: 'message',
        platformCode: 'instagram',
        recipientId: 'igsid-1',
        body: 'مرحبا',
      }),
    ).resolves.toEqual({ state: 'sent', providerReference: 'ig-mid-1' });
    expect(fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v23.0/ig-id/messages',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(
      (jest.mocked(fetch).mock.calls[0][1]?.body as string) ?? '{}',
    ) as Record<string, unknown>;
    expect(body.messaging_type).toBeUndefined();
  });

  it('refuses to send on a channel that is not linked', async () => {
    const adapter = new MetaInboxDeliveryAdapter(config, credentials({}));
    await expect(
      adapter.enqueue({
        organizationId: ORGANIZATION,
        conversationId: 'conversation',
        messageId: 'message',
        platformCode: 'instagram',
        recipientId: 'igsid-1',
        body: 'مرحبا',
      }),
    ).rejects.toMatchObject({ code: 'channel-not-configured', status: 503 });
  });
});
