import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../../core/exceptions';
import { campaignCorrelationMarker } from '../../../core/events/meta-message-status.event';
import {
  ChannelCredentialsService,
  type ChannelCredentials,
} from '../../inbox/channels/channel-credentials.service';
import { isNamed } from '../templates/template-parsing';

export interface TemplateSendRequest {
  organizationId: string;
  /** Digits only, in international format without a leading `+`. */
  to: string;
  templateName: string;
  language: string;
  bodyTokens: readonly string[];
  bodyValues: readonly string[];
  headerTokens: readonly string[];
  headerValues: readonly string[];
  /** Stamped as `biz_opaque_callback_data` so status webhooks echo it back. */
  correlationId?: string;
}

/**
 * How certain we are about whether the external side effect happened.
 *
 * - `explicit-refusal`: Meta gave a definitive "no" that will never change —
 *   an invalid number, a disabled template. Retrying only burns quota.
 * - `explicit-retryable`: Meta gave a definitive "not right now" — a rate
 *   limit, a transient 5xx. Safe to retry because Meta told us it did not
 *   accept the request.
 * - `ambiguous`: we do not know whether Meta received or accepted the
 *   request (the connection failed, or a 2xx response couldn't be read).
 *   Retrying here risks sending the same message twice, so the caller must
 *   never treat this as retryable.
 */
export type TemplateSendOutcome =
  'explicit-refusal' | 'explicit-retryable' | 'ambiguous';

/** A provider outcome, tagged with how certain and how safe-to-retry it is. */
export class TemplateSendError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly outcome: TemplateSendOutcome,
  ) {
    super(message);
    this.name = 'TemplateSendError';
  }

  get retryable(): boolean {
    return this.outcome === 'explicit-retryable';
  }
}

/**
 * Meta error codes worth another attempt. Everything else is a decision about
 * this recipient — an invalid number, a template that no longer exists — and
 * retrying only burns quota.
 */
const RETRYABLE_CODES = new Set([
  '4', // application request limit reached
  '80007', // rate limit issues
  '130429', // cloud API message throughput reached
  '131016', // service temporarily unavailable
  '131048', // spam rate limit hit
  '131056', // pair rate limit hit
  '133016', // temporary blocking
  '368', // temporarily blocked for policy violations
]);

const SEND_TIMEOUT_MS = 30_000;

interface GraphSendResponse {
  messages?: Array<{ id: string }>;
  error?: {
    message?: string;
    code?: number;
    error_data?: { details?: string };
  };
}

@Injectable()
export class WhatsappTemplateSender {
  constructor(
    private readonly config: ConfigService,
    private readonly credentials: ChannelCredentialsService,
  ) {}

  async channel(organizationId: string): Promise<ChannelCredentials> {
    const resolved = await this.credentials.forPlatform(
      organizationId,
      'whatsapp',
    );
    if (!resolved)
      throw new DomainException(
        'channel-not-configured',
        'قناة واتساب غير مهيأة على الخادم. أضف بيانات الاعتماد في متغيرات البيئة.',
        503,
      );
    return resolved;
  }

  private parameters(
    tokens: readonly string[],
    values: readonly string[],
  ): Array<Record<string, unknown>> {
    const named = isNamed(tokens);
    return tokens.map((token, index) => ({
      type: 'text',
      ...(named ? { parameter_name: token } : {}),
      text: values[index] ?? '',
    }));
  }

  async send(
    request: TemplateSendRequest,
    channel: ChannelCredentials,
  ): Promise<string> {
    const components: Array<Record<string, unknown>> = [];
    if (request.headerTokens.length)
      components.push({
        type: 'header',
        parameters: this.parameters(request.headerTokens, request.headerValues),
      });
    if (request.bodyTokens.length)
      components.push({
        type: 'body',
        parameters: this.parameters(request.bodyTokens, request.bodyValues),
      });

    const version = this.config.get<string>('meta.graphVersion') ?? 'v25.0';
    let response: Response;
    try {
      response = await fetch(
        `https://graph.facebook.com/${version}/${channel.providerAccountId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${channel.accessToken}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: request.to,
            type: 'template',
            template: {
              name: request.templateName,
              language: { code: request.language },
              ...(components.length ? { components } : {}),
            },
            ...(request.correlationId
              ? {
                  biz_opaque_callback_data: campaignCorrelationMarker(
                    request.correlationId,
                  ),
                }
              : {}),
          }),
        },
      );
    } catch (error) {
      // The request may or may not have reached Meta — a dropped connection
      // tells us nothing either way. Never classify this as safe to retry.
      throw new TemplateSendError(
        'network',
        error instanceof Error ? error.message : 'تعذر الاتصال بمنصة Meta',
        'ambiguous',
      );
    }

    const payload = (await response
      .json()
      .catch(() => ({}))) as GraphSendResponse;
    if (!response.ok || payload.error) {
      const code = String(payload.error?.code ?? response.status);
      const retryable = RETRYABLE_CODES.has(code) || response.status === 429;
      // A generic 5xx can be emitted after an upstream accepted the request;
      // without a documented idempotency key, replaying it is unsafe. Only a
      // provider code explicitly known to mean "not accepted, retry later"
      // (or HTTP 429) is automatically retried.
      const outcome: TemplateSendOutcome = retryable
        ? 'explicit-retryable'
        : response.status >= 500
          ? 'ambiguous'
          : 'explicit-refusal';
      throw new TemplateSendError(
        code,
        payload.error?.error_data?.details ??
          payload.error?.message ??
          'تعذر إرسال الرسالة عبر واتساب',
        outcome,
      );
    }
    const reference = payload.messages?.[0]?.id;
    if (!reference)
      // Meta answered 2xx — it may well have accepted the message — but the
      // body never yielded an id to record. We cannot tell; resending here
      // could duplicate an already-accepted send, so this stays ambiguous.
      throw new TemplateSendError(
        'provider-response-invalid',
        'استجابة واتساب غير صالحة',
        'ambiguous',
      );
    return reference;
  }
}
