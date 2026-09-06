import { Injectable } from '@nestjs/common';
import type {
  InboxDeliveryPort,
  InboxDeliveryRequest,
  InboxReadReceiptRequest,
} from './inbox-delivery.port';

@Injectable()
export class LocalInboxDeliveryAdapter implements InboxDeliveryPort {
  enqueue(request: InboxDeliveryRequest) {
    return Promise.resolve({
      state: 'queued' as const,
      providerReference: `local:${request.platformCode}:${request.messageId}`,
    });
  }
  markRead(request?: InboxReadReceiptRequest) {
    void request;
    return Promise.resolve();
  }
}
