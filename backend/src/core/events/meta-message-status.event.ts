/**
 * A delivery receipt Meta sent for one outbound message.
 *
 * The inbox webhook publishes these; whoever owns the message reacts. Keeping
 * the contract here rather than in either module means the webhook needs no
 * knowledge of campaigns, and campaigns need no knowledge of the webhook.
 */
export const META_MESSAGE_STATUS_EVENT = 'meta.message-status';

/**
 * Strict prefix for the non-secret WhatsApp `biz_opaque_callback_data`
 * correlation marker a campaign send attaches to a message. Meta echoes this
 * value back verbatim on every status webhook for that message, so a late
 * receipt can be matched to its recipient even when `providerMessageId` was
 * never persisted (e.g. a crash right after the Graph API accepted the
 * request).
 */
export const CAMPAIGN_CORRELATION_PREFIX = 'academy-campaign:v1:';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Builds the marker a campaign send attaches as `biz_opaque_callback_data`. */
export const campaignCorrelationMarker = (correlationId: string): string =>
  `${CAMPAIGN_CORRELATION_PREFIX}${correlationId}`;

/**
 * Strictly parses a `biz_opaque_callback_data` value back into a correlation
 * id. Returns `undefined` for anything that isn't exactly the expected
 * prefix + UUID shape — this value is attacker-influenced input Meta merely
 * echoes back, not a trusted identifier, so it is never parsed outside a
 * webhook call whose signature has already been verified.
 */
export const parseCampaignCorrelationId = (
  value: unknown,
): string | undefined => {
  if (
    typeof value !== 'string' ||
    !value.startsWith(CAMPAIGN_CORRELATION_PREFIX)
  )
    return undefined;
  const candidate = value.slice(CAMPAIGN_CORRELATION_PREFIX.length);
  return UUID_PATTERN.test(candidate) ? candidate.toLowerCase() : undefined;
};

export interface MetaMessageStatusEvent {
  providerMessageId: string;
  state: 'sent' | 'delivered' | 'read' | 'failed';
  occurredAt: string;
  errorCode?: string;
  errorMessage?: string;
  /** Present only for WhatsApp statuses that echoed a valid campaign marker. */
  correlationId?: string;
}
