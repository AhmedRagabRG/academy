export interface InboxDeliveryRequest {
  conversationId: string;
  messageId: string;
  platformCode: string;
  recipientId: string;
  body: string;
}
export interface InboxDeliveryResult {
  state: 'queued' | 'sent';
  providerReference: string;
}
export const INBOX_DELIVERY_PORT = Symbol('INBOX_DELIVERY_PORT');
export interface InboxDeliveryPort {
  enqueue(request: InboxDeliveryRequest): Promise<InboxDeliveryResult>;
  markRead(request: {
    platformCode: string;
    recipientId: string;
    providerMessageId?: string;
  }): Promise<void>;
}
