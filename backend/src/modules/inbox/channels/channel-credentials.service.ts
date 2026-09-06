import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { InboxChannelProvider } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import { ChannelCryptoService } from './channel-crypto.service';
import type { ChannelProviderCode } from './dto/channel.dto';

export const PROVIDER_BY_CODE: Record<
  ChannelProviderCode,
  InboxChannelProvider
> = {
  whatsapp: 'META_WHATSAPP',
  messenger: 'META_MESSENGER',
  instagram: 'META_INSTAGRAM',
};

export const CODE_BY_PROVIDER: Record<
  InboxChannelProvider,
  ChannelProviderCode
> = {
  META_WHATSAPP: 'whatsapp',
  META_MESSENGER: 'messenger',
  META_INSTAGRAM: 'instagram',
};

export interface ChannelCredentials {
  connectionId?: string;
  provider: InboxChannelProvider;
  platformCode: ChannelProviderCode;
  providerAccountId: string;
  accessToken: string;
  businessAccountId?: string;
}

export interface ResolvedInboundChannel {
  connectionId?: string;
  organizationId: string;
  platformId: string;
  platformCode: ChannelProviderCode;
}

/**
 * Single source of truth for "which credentials does this channel use".
 * A linked connection always wins; the environment variables remain as a
 * single-tenant fallback so an existing deployment keeps working unchanged.
 */
@Injectable()
export class ChannelCredentialsService {
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
    private readonly crypto: ChannelCryptoService,
  ) {}

  envCredentials(code: ChannelProviderCode): ChannelCredentials | null {
    const provider = PROVIDER_BY_CODE[code];
    const values: Record<ChannelProviderCode, [string, string]> = {
      whatsapp: [
        this.config.get<string>('meta.whatsappPhoneNumberId') ?? '',
        this.config.get<string>('meta.whatsappAccessToken') ?? '',
      ],
      messenger: [
        this.config.get<string>('meta.messengerPageId') ?? '',
        this.config.get<string>('meta.messengerPageAccessToken') ?? '',
      ],
      instagram: [
        this.config.get<string>('meta.instagramAccountId') ?? '',
        this.config.get<string>('meta.instagramAccessToken') ?? '',
      ],
    };
    const [providerAccountId, accessToken] = values[code];
    if (!providerAccountId || !accessToken) return null;
    return { provider, platformCode: code, providerAccountId, accessToken };
  }

  /** Credentials used to send on a conversation's platform. */
  async forPlatform(
    organizationId: string,
    code: string,
  ): Promise<ChannelCredentials | null> {
    if (!this.isChannelCode(code)) return null;
    const connection = await this.db.inboxChannelConnection.findFirst({
      where: {
        organizationId,
        provider: PROVIDER_BY_CODE[code],
        status: 'CONNECTED',
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!connection) return this.envCredentials(code);
    return {
      connectionId: connection.id,
      provider: connection.provider,
      platformCode: code,
      providerAccountId: connection.providerAccountId,
      accessToken: this.crypto.decrypt(connection.accessToken),
      businessAccountId: connection.businessAccountId ?? undefined,
    };
  }

  /** Routes an inbound webhook payload to the organization that owns it. */
  async forInbound(
    code: ChannelProviderCode,
    providerAccountId: string,
  ): Promise<ResolvedInboundChannel | null> {
    const connection = await this.db.inboxChannelConnection.findUnique({
      where: {
        provider_providerAccountId: {
          provider: PROVIDER_BY_CODE[code],
          providerAccountId,
        },
      },
    });
    if (connection && connection.status !== 'DISCONNECTED')
      return {
        connectionId: connection.id,
        organizationId: connection.organizationId,
        platformId: connection.platformId,
        platformCode: code,
      };
    const fallback = this.envCredentials(code);
    if (fallback && fallback.providerAccountId !== providerAccountId)
      return null;
    const platform = await this.db.inboxPlatform.findFirst({
      where: { code, active: true },
      orderBy: { id: 'asc' },
    });
    if (!platform) return null;
    return {
      organizationId: platform.organizationId,
      platformId: platform.id,
      platformCode: code,
    };
  }

  async markInbound(connectionId: string | undefined): Promise<void> {
    if (!connectionId) return;
    await this.db.inboxChannelConnection.update({
      where: { id: connectionId },
      data: { lastInboundAt: new Date() },
    });
  }

  isChannelCode(code: string): code is ChannelProviderCode {
    return code === 'whatsapp' || code === 'messenger' || code === 'instagram';
  }
}
