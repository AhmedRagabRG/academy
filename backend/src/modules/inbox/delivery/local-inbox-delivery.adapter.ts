import { Injectable } from '@nestjs/common';
import type {
  InboxDeliveryPort,
  InboxDeliveryRequest,
} from './inbox-delivery.port';

@Injectable()
export class LocalInboxDeliveryAdapter implements InboxDeliveryPort {
  enqueue(request: InboxDeliveryRequest) {
    return Promise.resolve({
      state: 'queued' as const,
      providerReference: `local:${request.platformCode}:${request.messageId}`,
    });
  }
  markRead(request?: {
    platformCode: string;
    recipientId: string;
    providerMessageId?: string;
  }) {
    void request;
    return Promise.resolve();
  }
}
