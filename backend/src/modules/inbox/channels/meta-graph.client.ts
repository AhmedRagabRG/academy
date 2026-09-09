import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../../core/exceptions';

export interface GraphError {
  message?: string;
  type?: string;
  code?: number;
}

export interface MessageTemplateComponent {
  type?: string;
  format?: string;
  text?: string;
  buttons?: Array<Record<string, unknown>>;
}

export interface MessageTemplateAsset {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  qualityScore?: string;
  rejectedReason?: string;
  components: MessageTemplateComponent[];
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const TEMPLATE_FIELDS =
  'id,name,language,status,category,components,quality_score,rejected_reason';

/**
 * The only query parameters a `paging.next` cursor is trusted to carry
 * forward. Graph sometimes echoes the whole original request back in the
 * cursor URL, including `access_token`/`appsecret_proof` — those must never
 * be copied out of a response body and back into our own outgoing request.
 */
const PAGINATION_PARAM_ALLOWLIST = new Set([
  'after',
  'before',
  'limit',
  'since',
  'until',
]);

/** A page fetched for every WABA account, ever — a real one never gets close. */
const MAX_TEMPLATE_PAGES = 20;
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80004, 80007]);

/**
 * Thin Graph API wrapper scoped to what the server needs with an
 * environment-configured access token: syncing the WhatsApp Business
 * Account's approved message templates. Every call funnels through
 * `request` so provider failures always surface as a domain error with the
 * provider message intact.
 */
@Injectable()
export class MetaGraphClient {
  constructor(private readonly config: ConfigService) {}

  private get version(): string {
    return this.config.get<string>('meta.graphVersion') ?? 'v25.0';
  }

  private url(path: string, params: Record<string, string> = {}): string {
    const search = new URLSearchParams(params).toString();
    return `https://graph.facebook.com/${this.version}/${path.replace(/^\//, '')}${
      search ? `?${search}` : ''
    }`;
  }

  async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    options: {
      token?: string;
      params?: Record<string, string>;
      body?: Record<string, unknown>;
    } = {},
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(this.url(path, options.params ?? {}), {
        method,
        headers: {
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
            : {}),
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
    } catch {
      throw new DomainException(
        'provider-unavailable',
        'تعذر الاتصال بمنصة Meta. حاول مرة أخرى.',
        502,
      );
    }
    const payload = (await response.json().catch(() => ({}))) as {
      error?: GraphError;
    } & Record<string, unknown>;
    if (!response.ok || payload.error) {
      const providerCode = payload.error?.code;
      const authenticationFailed =
        response.status === 401 ||
        response.status === 403 ||
        providerCode === 190;
      const rateLimited =
        response.status === 429 ||
        (providerCode !== undefined && RATE_LIMIT_CODES.has(providerCode));
      const unavailable = response.status >= 500;
      throw new DomainException(
        authenticationFailed
          ? 'provider-auth-failed'
          : rateLimited
            ? 'provider-rate-limited'
            : unavailable
              ? 'provider-unavailable'
              : 'provider-request-failed',
        payload.error?.message ?? 'تعذر الاتصال بمنصة Meta',
        authenticationFailed
          ? 422
          : rateLimited
            ? 503
            : unavailable
              ? 502
              : 422,
      );
    }
    return payload as T;
  }

  /**
   * Message templates registered on a WhatsApp Business Account.
   *
   * Every page is followed, because an account that has accumulated a few
   * hundred templates would otherwise present only its first fifty and the
   * composer would silently miss the rest.
   */
  async messageTemplates(
    wabaId: string,
    token: string,
  ): Promise<MessageTemplateAsset[]> {
    const templates: MessageTemplateAsset[] = [];
    let path = `${wabaId}/message_templates`;
    let params: Record<string, string> | undefined = {
      fields: TEMPLATE_FIELDS,
      limit: '100',
    };
    const seenPages = new Set<string>();
    for (let page = 0; ; page += 1) {
      if (page >= MAX_TEMPLATE_PAGES)
        throw new DomainException(
          'provider-pagination-limit',
          'حساب واتساب للأعمال يتجاوز عدد الصفحات الآمن للمزامنة. تواصل مع فريق التقنية.',
          502,
        );
      // Identifies this exact request; a cursor that repeats one already
      // fetched means the provider is looping, not paginating.
      const pageKey = `${path}?${new URLSearchParams(params ?? {}).toString()}`;
      if (seenPages.has(pageKey))
        throw new DomainException(
          'provider-pagination-cycle',
          'واجهة Meta أعادت صفحة مزامنة سبق جلبها.',
          502,
        );
      seenPages.add(pageKey);

      const payload: { data?: unknown; paging?: unknown } = await this.request<{
        data?: unknown;
        paging?: unknown;
      }>('GET', path, { token, ...(params ? { params } : {}) });
      for (const entry of asArray(payload.data)) {
        const template = asRecord(entry);
        const id = asString(template.id);
        const name = asString(template.name);
        const language = asString(template.language);
        const status = asString(template.status);
        if (!id || !name || !language || !status)
          throw new DomainException(
            'provider-response-invalid',
            'أعادت Meta قالبًا ببيانات ناقصة، لذلك لم تُحدّث ذاكرة القوالب.',
            502,
          );
        templates.push({
          id,
          name,
          language,
          status,
          category: asString(template.category),
          qualityScore:
            asString(asRecord(template.quality_score).score) || undefined,
          rejectedReason: asString(template.rejected_reason) || undefined,
          components: asArray(template.components).map((component) => {
            const part = asRecord(component);
            return {
              type: asString(part.type) || undefined,
              format: asString(part.format) || undefined,
              text: asString(part.text) || undefined,
              buttons: asArray(part.buttons).map((button) => asRecord(button)),
            };
          }),
        });
      }
      const next = asString(asRecord(payload.paging).next);
      if (!next) break;
      // The cursor URL is already absolute and carries its own query string,
      // but only pagination-shaped parameters are trusted from it: Graph can
      // echo the whole original request back, credentials included.
      let url: URL;
      try {
        url = new URL(next);
      } catch {
        throw new DomainException(
          'provider-pagination-invalid',
          'أعادت Meta مؤشر صفحة غير صالح.',
          502,
        );
      }
      const nextPath = url.pathname.replace(/^\/[^/]+\//, '');
      if (nextPath !== `${wabaId}/message_templates`)
        throw new DomainException(
          'provider-pagination-invalid',
          'أعادت Meta مسار صفحة غير متوقع.',
          502,
        );
      path = nextPath;
      const cursorParams = Object.fromEntries(
        [...url.searchParams.entries()].filter(([key]) =>
          PAGINATION_PARAM_ALLOWLIST.has(key.toLowerCase()),
        ),
      );
      // Meta's cursor URL may omit the requested projection. Always restore
      // it so later pages retain language, components, buttons and status.
      params = { fields: TEMPLATE_FIELDS, limit: '100', ...cursorParams };
    }
    return templates;
  }
}
