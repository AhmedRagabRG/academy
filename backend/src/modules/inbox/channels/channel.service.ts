import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  InboxChannelConnection,
  InboxChannelProvider,
} from '../../../../prisma/generated/client';
import {
  DomainException,
  ForbiddenException,
  NotFoundException,
} from '../../../core/exceptions';
import { PrismaService } from '../../../database/prisma.service';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  CODE_BY_PROVIDER,
  ChannelCredentialsService,
  PROVIDER_BY_CODE,
} from './channel-credentials.service';
import { ChannelCryptoService } from './channel-crypto.service';
import { ChannelLinkingStore } from './channel-linking.store';
import {
  MetaGraphClient,
  type PageAsset,
  type WhatsappNumberAsset,
} from './meta-graph.client';
import type {
  ChannelProviderCode,
  ConnectChannelDto,
  UpdateChannelDto,
} from './dto/channel.dto';

const PLATFORM_DEFAULTS: Record<
  ChannelProviderCode,
  { label: string; icon: string }
> = {
  whatsapp: { label: 'واتساب', icon: 'MessageCircle' },
  messenger: { label: 'فيسبوك ماسنجر', icon: 'Facebook' },
  instagram: { label: 'إنستغرام', icon: 'Instagram' },
};

const OAUTH_SCOPES = [
  'pages_show_list',
  'pages_manage_metadata',
  'pages_messaging',
  'instagram_basic',
  'instagram_manage_messages',
  'business_management',
  'whatsapp_business_management',
  'whatsapp_business_messaging',
] as const;

@Injectable()
export class ChannelService {
  constructor(
    private readonly db: PrismaService,
    private readonly graph: MetaGraphClient,
    private readonly crypto: ChannelCryptoService,
    private readonly credentials: ChannelCredentialsService,
    private readonly sessions: ChannelLinkingStore,
  ) {}

  private assert(c: CallerContext, permission: string): void {
    if (!c.permissionKeys.includes(permission)) throw new ForbiddenException();
  }

  private async organizationId(): Promise<string> {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }

  private project(
    row: InboxChannelConnection & { platform?: { code: string } },
  ) {
    return {
      id: row.id,
      provider: CODE_BY_PROVIDER[row.provider],
      platformId: row.platformId,
      providerAccountId: row.providerAccountId,
      businessAccountId: row.businessAccountId ?? undefined,
      displayName: row.displayName,
      accountLabel: row.accountLabel ?? undefined,
      status: row.status.toLowerCase(),
      scopes: row.scopes,
      lastError: row.lastError ?? undefined,
      tokenExpiresAt: row.tokenExpiresAt?.toISOString(),
      lastVerifiedAt: row.lastVerifiedAt?.toISOString(),
      lastInboundAt: row.lastInboundAt?.toISOString(),
      connectedByName: row.connectedByName,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(c: CallerContext) {
    this.assert(c, 'inbox.channels.view');
    const organizationId = await this.organizationId();
    const rows = await this.db.inboxChannelConnection.findMany({
      where: { organizationId },
      orderBy: [{ provider: 'asc' }, { createdAt: 'asc' }],
    });
    const linked = new Set(rows.map((row) => CODE_BY_PROVIDER[row.provider]));
    return {
      connections: rows.map((row) => this.project(row)),
      available: (Object.keys(PLATFORM_DEFAULTS) as ChannelProviderCode[]).map(
        (code) => ({
          provider: code,
          label: PLATFORM_DEFAULTS[code].label,
          linked: linked.has(code),
          environmentFallback: Boolean(this.credentials.envCredentials(code)),
        }),
      ),
      oauthConfigured: Boolean(this.graph.appId && this.graph.redirectUri),
    };
  }

  authorizationUrl(c: CallerContext, state: string) {
    this.assert(c, 'inbox.channels.manage');
    const value = state || randomUUID();
    return {
      state: value,
      url: this.graph.authorizationUrl(value, OAUTH_SCOPES),
    };
  }

  /**
   * Turns an OAuth code (or an already obtained user token) into the list of
   * pages, Instagram accounts, and WhatsApp numbers the operator can link.
   */
  async exchange(
    c: CallerContext,
    input: { code?: string; userAccessToken?: string; wabaId?: string },
  ) {
    this.assert(c, 'inbox.channels.manage');
    if (!input.code && !input.userAccessToken)
      throw new DomainException(
        'validation',
        'أرسل رمز التفويض أو رمز الوصول',
        422,
      );
    const shortLived = input.code
      ? await this.graph.exchangeCode(input.code)
      : input.userAccessToken!;
    const userAccessToken = await this.graph.longLivedToken(shortLived);
    const pages = await this.graph.pages(userAccessToken).catch(() => []);
    const wabaIds = input.wabaId
      ? [input.wabaId]
      : (
          await this.graph
            .whatsappBusinessAccounts(userAccessToken)
            .catch(() => [])
        ).map((account) => account.id);
    const whatsappNumbers: WhatsappNumberAsset[] = [];
    for (const wabaId of wabaIds)
      whatsappNumbers.push(
        ...(await this.graph
          .whatsappNumbers(wabaId, userAccessToken)
          .catch(() => [])),
      );
    const session = this.sessions.create(c.accountId, userAccessToken, {
      pages,
      whatsappNumbers,
    });
    return {
      sessionId: session.id,
      expiresAt: new Date(session.expiresAt).toISOString(),
      assets: {
        messenger: pages.map((page) => ({
          providerAccountId: page.id,
          displayName: page.name,
        })),
        instagram: pages
          .filter((page) => page.instagram)
          .map((page) => ({
            providerAccountId: page.instagram!.id,
            displayName: page.instagram!.name ?? page.name,
            accountLabel: page.instagram!.username
              ? `@${page.instagram!.username}`
              : undefined,
            businessAccountId: page.id,
          })),
        whatsapp: whatsappNumbers.map((number) => ({
          providerAccountId: number.id,
          displayName: number.verifiedName || number.displayPhoneNumber,
          accountLabel: number.displayPhoneNumber,
          businessAccountId: number.wabaId,
        })),
      },
    };
  }

  private tokenFromSession(
    c: CallerContext,
    dto: ConnectChannelDto,
  ): {
    accessToken: string;
    businessAccountId?: string;
    label?: string;
  } | null {
    if (!dto.sessionId) return null;
    const session = this.sessions.get(dto.sessionId, c.accountId);
    if (!session)
      throw new DomainException(
        'linking-session-expired',
        'انتهت جلسة الربط. أعد المحاولة.',
        409,
      );
    if (dto.provider === 'whatsapp') {
      const number = session.whatsappNumbers.find(
        (item) => item.id === dto.providerAccountId,
      );
      if (!number) return null;
      return {
        accessToken: session.userAccessToken,
        businessAccountId: number.wabaId,
        label: number.displayPhoneNumber,
      };
    }
    const page: PageAsset | undefined =
      dto.provider === 'messenger'
        ? session.pages.find((item) => item.id === dto.providerAccountId)
        : session.pages.find(
            (item) => item.instagram?.id === dto.providerAccountId,
          );
    if (!page) return null;
    return {
      accessToken: page.accessToken || session.userAccessToken,
      businessAccountId: dto.provider === 'instagram' ? page.id : undefined,
      label:
        dto.provider === 'instagram' && page.instagram?.username
          ? `@${page.instagram.username}`
          : page.name,
    };
  }

  private async platformFor(
    organizationId: string,
    code: ChannelProviderCode,
  ): Promise<string> {
    const existing = await this.db.inboxPlatform.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    if (existing) {
      if (!existing.active)
        await this.db.inboxPlatform.update({
          where: { id: existing.id },
          data: { active: true },
        });
      return existing.id;
    }
    const created = await this.db.inboxPlatform.create({
      data: { organizationId, code, ...PLATFORM_DEFAULTS[code] },
    });
    return created.id;
  }

  async connect(c: CallerContext, dto: ConnectChannelDto) {
    this.assert(c, 'inbox.channels.manage');
    const organizationId = await this.organizationId();
    const fromSession = this.tokenFromSession(c, dto);
    const accessToken = fromSession?.accessToken ?? dto.accessToken;
    if (!accessToken)
      throw new DomainException(
        'validation',
        'أرسل رمز وصول القناة أو اختر حسابًا من جلسة الربط',
        422,
      );
    const businessAccountId =
      dto.businessAccountId ?? fromSession?.businessAccountId;
    const description = await this.describeAccount(
      dto.provider,
      dto.providerAccountId,
      accessToken,
      businessAccountId,
    );
    const introspection = await this.graph.introspect(accessToken);
    const provider = PROVIDER_BY_CODE[dto.provider];
    const conflict = await this.db.inboxChannelConnection.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: dto.providerAccountId,
        },
      },
      select: { id: true, organizationId: true },
    });
    if (conflict && conflict.organizationId !== organizationId)
      throw new DomainException(
        'channel-already-linked',
        'هذا الحساب مرتبط بمؤسسة أخرى',
        409,
      );
    const platformId = await this.platformFor(organizationId, dto.provider);
    const data = {
      organizationId,
      platformId,
      provider,
      providerAccountId: dto.providerAccountId,
      businessAccountId: businessAccountId ?? null,
      displayName: dto.displayName ?? description.displayName,
      accountLabel: description.accountLabel ?? fromSession?.label ?? null,
      accessToken: this.crypto.encrypt(accessToken),
      tokenExpiresAt: introspection.expiresAt ?? null,
      scopes: introspection.scopes,
      status: 'CONNECTED' as const,
      lastError: null,
      lastVerifiedAt: new Date(),
      connectedById: c.accountId,
      connectedByName: c.displayName,
    };
    const row = conflict
      ? await this.db.inboxChannelConnection.update({
          where: { id: conflict.id },
          data: { ...data, version: { increment: 1 } },
        })
      : await this.db.inboxChannelConnection.create({ data });
    if (dto.subscribeWebhooks)
      await this.subscribe(dto, accessToken, businessAccountId, row.id);
    if (dto.sessionId) this.sessions.consume(dto.sessionId);
    return this.project(
      await this.db.inboxChannelConnection.findUniqueOrThrow({
        where: { id: row.id },
      }),
    );
  }

  /** Best-effort webhook subscription; a failure is recorded, never fatal. */
  private async subscribe(
    dto: ConnectChannelDto,
    accessToken: string,
    businessAccountId: string | undefined,
    connectionId: string,
  ): Promise<void> {
    try {
      if (dto.provider === 'whatsapp') {
        if (businessAccountId)
          await this.graph.subscribeWhatsappBusiness(
            businessAccountId,
            accessToken,
          );
        return;
      }
      const pageId =
        dto.provider === 'messenger'
          ? dto.providerAccountId
          : (businessAccountId ?? '');
      if (pageId) await this.graph.subscribePage(pageId, accessToken);
    } catch (error) {
      await this.db.inboxChannelConnection.update({
        where: { id: connectionId },
        data: {
          lastError:
            error instanceof Error
              ? error.message
              : 'webhook subscription failed',
        },
      });
    }
  }

  private async describeAccount(
    provider: ChannelProviderCode,
    providerAccountId: string,
    accessToken: string,
    businessAccountId?: string,
  ): Promise<{ displayName: string; accountLabel?: string }> {
    const fields =
      provider === 'whatsapp'
        ? 'display_phone_number,verified_name'
        : provider === 'instagram'
          ? 'username,name'
          : 'name';
    const payload: Record<string, unknown> = await this.graph
      .describe(providerAccountId, accessToken, fields)
      .catch(() => ({}));
    const text = (key: string) =>
      typeof payload[key] === 'string' ? payload[key] : '';
    if (provider === 'whatsapp')
      return {
        displayName:
          text('verified_name') ||
          text('display_phone_number') ||
          providerAccountId,
        accountLabel: text('display_phone_number') || undefined,
      };
    if (provider === 'instagram')
      return {
        displayName: text('name') || text('username') || providerAccountId,
        accountLabel: text('username') ? `@${text('username')}` : undefined,
      };
    void businessAccountId;
    return { displayName: text('name') || providerAccountId };
  }

  private async owned(id: string): Promise<InboxChannelConnection> {
    const organizationId = await this.organizationId();
    const row = await this.db.inboxChannelConnection.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  async update(c: CallerContext, id: string, dto: UpdateChannelDto) {
    this.assert(c, 'inbox.channels.manage');
    const row = await this.owned(id);
    const introspection = dto.accessToken
      ? await this.graph.introspect(dto.accessToken)
      : null;
    return this.project(
      await this.db.inboxChannelConnection.update({
        where: { id },
        data: {
          ...(dto.displayName ? { displayName: dto.displayName } : {}),
          ...(dto.accessToken
            ? {
                accessToken: this.crypto.encrypt(dto.accessToken),
                tokenExpiresAt: introspection?.expiresAt ?? null,
                scopes: introspection?.scopes ?? [],
                status: 'CONNECTED' as const,
                lastError: null,
                lastVerifiedAt: new Date(),
              }
            : {}),
          version: { increment: 1 },
        },
      }),
    );
  }

  async verify(c: CallerContext, id: string) {
    this.assert(c, 'inbox.channels.view');
    const row = await this.owned(id);
    const introspection = await this.graph.introspect(
      this.crypto.decrypt(row.accessToken),
    );
    return this.project(
      await this.db.inboxChannelConnection.update({
        where: { id },
        data: {
          status: introspection.valid ? 'CONNECTED' : 'ERROR',
          lastError: introspection.valid
            ? null
            : (introspection.error ?? 'invalid token'),
          tokenExpiresAt: introspection.expiresAt ?? row.tokenExpiresAt,
          scopes: introspection.scopes.length
            ? introspection.scopes
            : row.scopes,
          lastVerifiedAt: new Date(),
          version: { increment: 1 },
        },
      }),
    );
  }

  async disconnect(c: CallerContext, id: string) {
    this.assert(c, 'inbox.channels.manage');
    await this.owned(id);
    return this.project(
      await this.db.inboxChannelConnection.update({
        where: { id },
        data: { status: 'DISCONNECTED', version: { increment: 1 } },
      }),
    );
  }

  async remove(c: CallerContext, id: string): Promise<void> {
    this.assert(c, 'inbox.channels.manage');
    await this.owned(id);
    await this.db.inboxChannelConnection.delete({ where: { id } });
  }
}

export type { InboxChannelProvider };
