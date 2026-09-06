import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../../core/exceptions';

export interface GraphError {
  message?: string;
  type?: string;
  code?: number;
}

export interface PageAsset {
  id: string;
  name: string;
  accessToken: string;
  instagram?: { id: string; username?: string; name?: string };
}

export interface WhatsappNumberAsset {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string;
  wabaId: string;
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

export interface TokenIntrospection {
  valid: boolean;
  scopes: string[];
  expiresAt?: Date;
  error?: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

/**
 * Thin Graph API wrapper. Every call funnels through `request` so provider
 * failures always surface as a domain error with the provider message intact.
 */
@Injectable()
export class MetaGraphClient {
  constructor(private readonly config: ConfigService) {}

  private get version(): string {
    return this.config.get<string>('meta.graphVersion') ?? 'v25.0';
  }

  get appId(): string {
    return this.config.get<string>('meta.appId') ?? '';
  }

  get appSecret(): string {
    return this.config.get<string>('meta.appSecret') ?? '';
  }

  get redirectUri(): string {
    return this.config.get<string>('meta.redirectUri') ?? '';
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

  /** Login dialog URL the operator opens to grant the app access. */
  authorizationUrl(state: string, scopes: readonly string[]): string {
    if (!this.appId || !this.redirectUri)
      throw new DomainException(
        'oauth-not-configured',
        'ربط Meta غير مهيأ. أضف META_APP_ID و META_OAUTH_REDIRECT_URI.',
        503,
      );
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      state,
      response_type: 'code',
      scope: scopes.join(','),
    });
    return `https://www.facebook.com/${this.version}/dialog/oauth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<string> {
    if (!this.appId || !this.appSecret)
      throw new DomainException(
        'oauth-not-configured',
        'ربط Meta غير مهيأ. أضف META_APP_ID و META_APP_SECRET.',
        503,
      );
    const payload = await this.request<{ access_token?: string }>(
      'GET',
      'oauth/access_token',
      {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: this.redirectUri,
          code,
        },
      },
    );
    const token = asString(payload.access_token);
    if (!token)
      throw new DomainException(
        'oauth-exchange-failed',
        'تعذر تبديل رمز التفويض',
        502,
      );
    return token;
  }

  /** Upgrades a short-lived user token to a ~60 day token. */
  async longLivedToken(shortLivedToken: string): Promise<string> {
    if (!this.appId || !this.appSecret) return shortLivedToken;
    const payload = await this.request<{ access_token?: string }>(
      'GET',
      'oauth/access_token',
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: shortLivedToken,
        },
      },
    );
    return asString(payload.access_token) || shortLivedToken;
  }

  async introspect(token: string): Promise<TokenIntrospection> {
    if (!this.appId || !this.appSecret) return { valid: true, scopes: [] };
    try {
      const payload = await this.request<{ data?: unknown }>(
        'GET',
        'debug_token',
        {
          params: {
            input_token: token,
            access_token: `${this.appId}|${this.appSecret}`,
          },
        },
      );
      const data = asRecord(payload.data);
      const expiresAt = Number(data.expires_at);
      return {
        valid: data.is_valid === true,
        scopes: asArray(data.scopes).filter(
          (scope): scope is string => typeof scope === 'string',
        ),
        expiresAt:
          Number.isFinite(expiresAt) && expiresAt > 0
            ? new Date(expiresAt * 1000)
            : undefined,
        error: asString(asRecord(data.error).message) || undefined,
      };
    } catch (error) {
      return {
        valid: false,
        scopes: [],
        error: error instanceof Error ? error.message : 'unknown',
      };
    }
  }

  /** Pages the token can manage, with any linked Instagram professional account. */
  async pages(userToken: string): Promise<PageAsset[]> {
    const payload = await this.request<{ data?: unknown }>(
      'GET',
      'me/accounts',
      {
        token: userToken,
        params: {
          fields:
            'id,name,access_token,instagram_business_account{id,username,name}',
          limit: '100',
        },
      },
    );
    return asArray(payload.data).map((entry) => {
      const page = asRecord(entry);
      const instagram = asRecord(page.instagram_business_account);
      const instagramId = asString(instagram.id);
      return {
        id: asString(page.id),
        name: asString(page.name),
        accessToken: asString(page.access_token),
        ...(instagramId
          ? {
              instagram: {
                id: instagramId,
                username: asString(instagram.username) || undefined,
                name: asString(instagram.name) || undefined,
              },
            }
          : {}),
      };
    });
  }

  /** Phone numbers under a WhatsApp Business Account. */
  async whatsappNumbers(
    wabaId: string,
    token: string,
  ): Promise<WhatsappNumberAsset[]> {
    const payload = await this.request<{ data?: unknown }>(
      'GET',
      `${wabaId}/phone_numbers`,
      {
        token,
        params: {
          fields: 'id,display_phone_number,verified_name',
          limit: '50',
        },
      },
    );
    return asArray(payload.data).map((entry) => {
      const number = asRecord(entry);
      return {
        id: asString(number.id),
        displayPhoneNumber: asString(number.display_phone_number),
        verifiedName: asString(number.verified_name),
        wabaId,
      };
    });
  }

  /** WhatsApp Business Accounts the token can manage. */
  async whatsappBusinessAccounts(
    userToken: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const payload = await this.request<{ data?: unknown }>(
      'GET',
      'me/businesses',
      { token: userToken, params: { fields: 'id,name', limit: '50' } },
    );
    const businesses = asArray(payload.data).map((entry) => asRecord(entry));
    const accounts: Array<{ id: string; name: string }> = [];
    for (const business of businesses) {
      const owned = await this.request<{ data?: unknown }>(
        'GET',
        `${asString(business.id)}/owned_whatsapp_business_accounts`,
        { token: userToken, params: { fields: 'id,name', limit: '50' } },
      ).catch(() => ({ data: [] }));
      for (const entry of asArray(owned.data)) {
        const account = asRecord(entry);
        accounts.push({
          id: asString(account.id),
          name: asString(account.name) || asString(business.name),
        });
      }
    }
    return accounts;
  }

  /** Reads the provider-side label for an already known account id. */
  async describe(
    node: string,
    token: string,
    fields: string,
  ): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('GET', node, {
      token,
      params: { fields },
    });
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

  async subscribePage(pageId: string, pageToken: string): Promise<void> {
    await this.request('POST', `${pageId}/subscribed_apps`, {
      token: pageToken,
      params: {
        subscribed_fields:
          'messages,messaging_postbacks,message_reads,messaging_referrals',
      },
    });
  }

  async subscribeWhatsappBusiness(
    wabaId: string,
    token: string,
  ): Promise<void> {
    await this.request('POST', `${wabaId}/subscribed_apps`, { token });
  }
}
