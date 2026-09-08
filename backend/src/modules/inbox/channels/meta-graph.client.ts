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
    const response = await fetch(this.url(path, options.params ?? {}), {
      method,
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: GraphError;
    } & Record<string, unknown>;
    if (!response.ok || payload.error)
      throw new DomainException(
        'provider-request-failed',
        payload.error?.message ?? 'تعذر الاتصال بمنصة Meta',
        response.status === 401 || response.status === 403 ? 422 : 502,
      );
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
      fields:
        'id,name,language,status,category,components,quality_score,rejected_reason',
      limit: '100',
    };
    for (let page = 0; page < 20; page += 1) {
      const payload: { data?: unknown; paging?: unknown } = await this.request<{
        data?: unknown;
        paging?: unknown;
      }>('GET', path, { token, ...(params ? { params } : {}) });
      for (const entry of asArray(payload.data)) {
        const template = asRecord(entry);
        const id = asString(template.id);
        if (!id) continue;
        templates.push({
          id,
          name: asString(template.name),
          language: asString(template.language),
          status: asString(template.status),
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
      // The cursor URL is already absolute and carries its own query string.
      const url = new URL(next);
      path = url.pathname.replace(/^\/[^/]+\//, '');
      params = Object.fromEntries(url.searchParams.entries());
    }
    return templates;
  }
}
