import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../../core/exceptions';
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
}

/** A provider refusal, tagged with whether trying again could ever succeed. */
export class TemplateSendError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'TemplateSendError';
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
          }),
        },
      );
    } catch (error) {
      throw new TemplateSendError(
        'network',
        error instanceof Error ? error.message : 'تعذر الاتصال بمنصة Meta',
        true,
      );
    }

    const payload = (await response
      .json()
      .catch(() => ({}))) as GraphSendResponse;
    if (!response.ok || payload.error) {
      const code = String(payload.error?.code ?? response.status);
      throw new TemplateSendError(
        code,
        payload.error?.error_data?.details ??
          payload.error?.message ??
          'تعذر إرسال الرسالة عبر واتساب',
        RETRYABLE_CODES.has(code) || response.status >= 500,
      );
    }
    const reference = payload.messages?.[0]?.id;
    if (!reference)
      throw new TemplateSendError(
        'provider-response-invalid',
        'استجابة واتساب غير صالحة',
        true,
      );
    return reference;
  }
}
