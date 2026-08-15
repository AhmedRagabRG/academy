import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../../core/exceptions';
import type {
  InboxDeliveryPort,
  InboxDeliveryRequest,
  InboxDeliveryResult,
} from './inbox-delivery.port';

interface MetaSendResponse {
  messages?: Array<{ id: string }>;
  message_id?: string;
}

@Injectable()
export class MetaInboxDeliveryAdapter implements InboxDeliveryPort {
  constructor(private readonly config: ConfigService) {}

  private async post(
    url: string,
    token: string,
    body: Record<string, unknown>,
  ): Promise<MetaSendResponse> {
    if (!token)
      throw new DomainException(
        'channel-not-configured',
        'قناة Meta غير مهيأة للإرسال',
        503,
      );
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as MetaSendResponse & {
      error?: { message?: string };
    };
    if (!response.ok)
      throw new DomainException(
        'provider-delivery-failed',
        payload.error?.message ?? 'تعذر إرسال الرسالة عبر Meta',
        502,
      );
    return payload;
  }

  async enqueue(request: InboxDeliveryRequest): Promise<InboxDeliveryResult> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');
    if (request.platformCode === 'whatsapp') {
      const phoneId = this.config.getOrThrow<string>(
        'meta.whatsappPhoneNumberId',
      );
      const payload = await this.post(
        `https://graph.facebook.com/${version}/${phoneId}/messages`,
        this.config.getOrThrow<string>('meta.whatsappAccessToken'),
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: request.recipientId,
          type: 'text',
          text: { preview_url: false, body: request.body },
        },
      );
      const reference = payload.messages?.[0]?.id;
      if (!reference)
        throw new DomainException(
          'provider-response-invalid',
          'استجابة واتساب غير صالحة',
          502,
        );
      return { state: 'sent', providerReference: reference };
    }
    if (request.platformCode === 'messenger') {
      const pageId = this.config.getOrThrow<string>('meta.messengerPageId');
      const payload = await this.post(
        `https://graph.facebook.com/${version}/${pageId}/messages`,
        this.config.getOrThrow<string>('meta.messengerPageAccessToken'),
        {
          recipient: { id: request.recipientId },
          messaging_type: 'RESPONSE',
          message: { text: request.body },
        },
      );
      const reference = payload.message_id;
      if (!reference)
        throw new DomainException(
          'provider-response-invalid',
          'استجابة ماسنجر غير صالحة',
          502,
        );
      return { state: 'sent', providerReference: reference };
    }
    throw new DomainException(
      'channel-not-supported',
      'هذه القناة لا تدعم الإرسال الحقيقي',
      422,
    );
  }

  async markRead(request: {
    platformCode: string;
    recipientId: string;
    providerMessageId?: string;
  }): Promise<void> {
    const version = this.config.getOrThrow<string>('meta.graphVersion');
    if (request.platformCode === 'whatsapp' && request.providerMessageId) {
      const phoneId = this.config.getOrThrow<string>(
        'meta.whatsappPhoneNumberId',
      );
      await this.post(
        `https://graph.facebook.com/${version}/${phoneId}/messages`,
        this.config.getOrThrow<string>('meta.whatsappAccessToken'),
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: request.providerMessageId,
        },
      );
    }
    if (request.platformCode === 'messenger') {
      const pageId = this.config.getOrThrow<string>('meta.messengerPageId');
      await this.post(
        `https://graph.facebook.com/${version}/${pageId}/messages`,
        this.config.getOrThrow<string>('meta.messengerPageAccessToken'),
        {
          recipient: { id: request.recipientId },
          sender_action: 'mark_seen',
        },
      );
    }
  }
}
