import { Injectable } from '@nestjs/common';
import type {
  InboxDeliveryPort,
  InboxDeliveryRequest,
} from './inbox-delivery.port';
import { LocalInboxDeliveryAdapter } from './local-inbox-delivery.adapter';
import { MetaInboxDeliveryAdapter } from './meta-inbox-delivery.adapter';

@Injectable()
export class ChannelInboxDeliveryAdapter implements InboxDeliveryPort {
  constructor(
    private readonly meta: MetaInboxDeliveryAdapter,
    private readonly local: LocalInboxDeliveryAdapter,
  ) {}

  enqueue(request: InboxDeliveryRequest) {
    return request.platformCode === 'whatsapp' ||
      request.platformCode === 'messenger'
      ? this.meta.enqueue(request)
      : this.local.enqueue(request);
  }

  markRead(request: {
    platformCode: string;
    recipientId: string;
    providerMessageId?: string;
  }) {
    return request.platformCode === 'whatsapp' ||
      request.platformCode === 'messenger'
      ? this.meta.markRead(request)
      : this.local.markRead(request);
  }
}
