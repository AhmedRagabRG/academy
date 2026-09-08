import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';

export const CHANNEL_PROVIDERS = [
  'whatsapp',
  'messenger',
  'instagram',
] as const;
export type ChannelProviderCode = (typeof CHANNEL_PROVIDERS)[number];

export interface ChannelCredentials {
  platformCode: ChannelProviderCode;
  providerAccountId: string;
  accessToken: string;
  businessAccountId?: string;
}

export interface ResolvedInboundChannel {
  organizationId: string;
  platformId: string;
  platformCode: ChannelProviderCode;
}

/**
 * Single source of truth for "which credentials does this channel use".
 * WhatsApp, Messenger, and Instagram configuration comes only from backend
 * environment variables; there is no browser-driven linking flow.
 */
@Injectable()
export class ChannelCredentialsService {
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
  ) {}

  envCredentials(code: ChannelProviderCode): ChannelCredentials | null {
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
    const businessAccountId =
      code === 'whatsapp'
        ? this.config.get<string>('meta.whatsappBusinessAccountId') || undefined
        : undefined;
    return {
      platformCode: code,
      providerAccountId,
      accessToken,
      ...(businessAccountId ? { businessAccountId } : {}),
    };
  }

  /** Credentials used to send on a conversation's platform. */
  forPlatform(
    organizationId: string,
    code: string,
  ): Promise<ChannelCredentials | null> {
    void organizationId;
    if (!this.isChannelCode(code)) return Promise.resolve(null);
    return Promise.resolve(this.envCredentials(code));
  }

  /**
   * Routes an inbound webhook payload to the organization that owns it. The
   * provider account id must match the environment-configured account, so a
   * webhook call for someone else's number/page/account is dropped.
   */
  async forInbound(
    code: ChannelProviderCode,
    providerAccountId: string,
  ): Promise<ResolvedInboundChannel | null> {
    const configured = this.envCredentials(code);
    if (!configured || configured.providerAccountId !== providerAccountId)
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

  isChannelCode(code: string): code is ChannelProviderCode {
    return code === 'whatsapp' || code === 'messenger' || code === 'instagram';
  }
}
