import { Injectable } from '@nestjs/common';
import type {
  InboxDeliveryPort,
  InboxDeliveryRequest,
  InboxReadReceiptRequest,
} from './inbox-delivery.port';
import { LocalInboxDeliveryAdapter } from './local-inbox-delivery.adapter';
import { MetaInboxDeliveryAdapter } from './meta-inbox-delivery.adapter';

const META_CHANNELS = new Set(['whatsapp', 'messenger', 'instagram']);

@Injectable()
export class ChannelInboxDeliveryAdapter implements InboxDeliveryPort {
  constructor(
    private readonly meta: MetaInboxDeliveryAdapter,
    private readonly local: LocalInboxDeliveryAdapter,
  ) {}

  enqueue(request: InboxDeliveryRequest) {
    return META_CHANNELS.has(request.platformCode)
      ? this.meta.enqueue(request)
      : this.local.enqueue(request);
  }

  markRead(request: InboxReadReceiptRequest) {
    return META_CHANNELS.has(request.platformCode)
      ? this.meta.markRead(request)
      : this.local.markRead(request);
  }
}
