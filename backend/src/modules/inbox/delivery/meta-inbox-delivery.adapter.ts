import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../../core/exceptions';
import {
  ChannelCredentialsService,
  type ChannelCredentials,
} from '../channels/channel-credentials.service';
import type {
  InboxDeliveryPort,
  InboxDeliveryRequest,
  InboxDeliveryResult,
  InboxReadReceiptRequest,
} from './inbox-delivery.port';

interface MetaSendResponse {
  messages?: Array<{ id: string }>;
  message_id?: string;
}

@Injectable()
export class MetaInboxDeliveryAdapter implements InboxDeliveryPort {
  constructor(
    private readonly config: ConfigService,
    private readonly credentials: ChannelCredentialsService,
  ) {}

  private async resolve(
    organizationId: string,
    platformCode: string,
  ): Promise<ChannelCredentials> {
    const resolved = await this.credentials.forPlatform(
      organizationId,
      platformCode,
    );
    if (!resolved)
      throw new DomainException(
        'channel-not-configured',
        'قناة Meta غير مرتبطة بعد. اربط الحساب من إعدادات القنوات.',
        503,
      );
    return resolved;
  }

  private async post(
    node: string,
    token: string,
    body: Record<string, unknown>,
  ): Promise<MetaSendResponse> {
    const version = this.config.get<string>('meta.graphVersion') ?? 'v25.0';
    const response = await fetch(
      `https://graph.facebook.com/${version}/${node}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );
    const payload = (await response
      .json()
      .catch(() => ({}))) as MetaSendResponse & {
      error?: { message?: string };
    };
    if (!response.ok || payload.error)
      throw new DomainException(
        'provider-delivery-failed',
        payload.error?.message ?? 'تعذر إرسال الرسالة عبر Meta',
        502,
      );
    return payload;
  }

  async enqueue(request: InboxDeliveryRequest): Promise<InboxDeliveryResult> {
    const channel = await this.resolve(
      request.organizationId,
      request.platformCode,
    );
    if (channel.platformCode === 'whatsapp') {
      const payload = await this.post(
        channel.providerAccountId,
        channel.accessToken,
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
    const payload = await this.post(
      channel.providerAccountId,
      channel.accessToken,
      {
        recipient: { id: request.recipientId },
        ...(channel.platformCode === 'messenger'
          ? { messaging_type: 'RESPONSE' }
          : {}),
        message: { text: request.body },
      },
    );
    const reference = payload.message_id;
    if (!reference)
      throw new DomainException(
        'provider-response-invalid',
        channel.platformCode === 'instagram'
          ? 'استجابة إنستغرام غير صالحة'
          : 'استجابة ماسنجر غير صالحة',
        502,
      );
    return { state: 'sent', providerReference: reference };
  }

  async markRead(request: InboxReadReceiptRequest): Promise<void> {
    const channel = await this.credentials.forPlatform(
      request.organizationId,
      request.platformCode,
    );
    if (!channel) return;
    if (channel.platformCode === 'whatsapp') {
      if (!request.providerMessageId) return;
      await this.post(channel.providerAccountId, channel.accessToken, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: request.providerMessageId,
      });
      return;
    }
    await this.post(channel.providerAccountId, channel.accessToken, {
      recipient: { id: request.recipientId },
      sender_action: 'mark_seen',
    });
  }
}
