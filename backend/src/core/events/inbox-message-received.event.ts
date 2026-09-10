/**
 * An inbound customer message that has been durably persisted.
 *
 * The inbox webhook publishes these; whoever wants to react does so. Keeping
 * the contract here rather than in either module means the webhook needs no
 * knowledge of the AI, and the AI module can depend on the inbox without a
 * cycle — mirroring how META_MESSAGE_STATUS_EVENT decouples campaigns.
 *
 * Deliberately published AFTER the transaction commits. The AI's fencing token
 * is incremented inside that transaction because it must roll back with a
 * duplicate delivery; enqueuing has no such requirement, and a listener that
 * throws must never fail a webhook Meta would then redeliver.
 */
export const INBOX_MESSAGE_RECEIVED_EVENT = 'inbox.message-received';

export interface InboxMessageReceivedEvent {
  organizationId: string;
  conversationId: string;
  platformCode: string;
}
