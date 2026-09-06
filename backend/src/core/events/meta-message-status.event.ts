/**
 * A delivery receipt Meta sent for one outbound message.
 *
 * The inbox webhook publishes these; whoever owns the message reacts. Keeping
 * the contract here rather than in either module means the webhook needs no
 * knowledge of campaigns, and campaigns need no knowledge of the webhook.
 */
export const META_MESSAGE_STATUS_EVENT = 'meta.message-status';

export interface MetaMessageStatusEvent {
  providerMessageId: string;
  state: 'sent' | 'delivered' | 'read' | 'failed';
  occurredAt: string;
  errorCode?: string;
  errorMessage?: string;
}
