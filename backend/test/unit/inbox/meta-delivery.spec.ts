import { ConfigService } from '@nestjs/config';
import { MetaInboxDeliveryAdapter } from '../../../src/modules/inbox/delivery/meta-inbox-delivery.adapter';

describe('MetaInboxDeliveryAdapter', () => {
  const config = new ConfigService({
    meta: {
      graphVersion: 'v23.0',
      whatsappPhoneNumberId: 'phone-id',
      whatsappAccessToken: 'wa-token',
      messengerPageId: 'page-id',
      messengerPageAccessToken: 'page-token',
    },
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends WhatsApp text through the configured phone number', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid-1' }] }), {
        status: 200,
      }),
    );
    const adapter = new MetaInboxDeliveryAdapter(config);
    await expect(
      adapter.enqueue({
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
    const adapter = new MetaInboxDeliveryAdapter(config);
    await expect(
      adapter.enqueue({
        conversationId: 'conversation',
        messageId: 'message',
        platformCode: 'messenger',
        recipientId: 'psid-1',
        body: 'مرحبا',
      }),
    ).resolves.toEqual({ state: 'sent', providerReference: 'mid-1' });
  });
});
