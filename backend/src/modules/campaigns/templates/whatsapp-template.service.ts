import { Injectable, Logger } from '@nestjs/common';
import type {
  Prisma,
  WhatsappTemplate,
  WhatsappTemplateStatus,
} from '../../../../prisma/generated/client';
import { DomainException } from '../../../core/exceptions';
import { PrismaService } from '../../../database/prisma.service';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ChannelCredentialsService } from '../../inbox/channels/channel-credentials.service';
import { MetaGraphClient } from '../../inbox/channels/meta-graph.client';
import { CampaignPolicy } from '../campaign.policy';
import type { TemplateListDto } from '../dto/campaign.dto';
import {
  isNamed,
  parseComponents,
  parsePlaceholders,
} from './template-parsing';

const STATUS_DB: Record<string, WhatsappTemplateStatus> = {
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  IN_APPEAL: 'PENDING',
  PENDING_DELETION: 'PENDING',
  REJECTED: 'REJECTED',
  PAUSED: 'PAUSED',
  DISABLED: 'DISABLED',
  DELETED: 'DISABLED',
};

@Injectable()
export class WhatsappTemplateService {
  private readonly logger = new Logger(WhatsappTemplateService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly graph: MetaGraphClient,
    private readonly credentials: ChannelCredentialsService,
    private readonly policy: CampaignPolicy,
  ) {}

  project(row: WhatsappTemplate) {
    const tokens = parsePlaceholders(row.bodyText);
    const headerTokens = parsePlaceholders(row.headerText ?? '');
    return {
      id: row.id,
      name: row.name,
      language: row.language,
      category: row.category,
      status: row.status.toLowerCase(),
      headerKind: row.headerKind ?? undefined,
      headerText: row.headerText ?? undefined,
      bodyText: row.bodyText,
      footerText: row.footerText ?? undefined,
      buttons: row.buttons ?? [],
      variableTokens: tokens,
      headerVariableTokens: headerTokens,
      variableCount: row.variableCount,
      headerVariableCount: row.headerVariableCount,
      /** A named template needs every placeholder bound; positions are labels. */
      named: isNamed(tokens) || isNamed(headerTokens),
      qualityScore: row.qualityScore ?? undefined,
      rejectedReason: row.rejectedReason ?? undefined,
      syncedAt: row.syncedAt.toISOString(),
    };
  }

  async list(c: CallerContext, query: TemplateListDto) {
    this.policy.assert(c, 'campaigns.view');
    const organizationId = (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
    const search = query.search.trim();
    const rows = await this.db.whatsappTemplate.findMany({
      where: {
        organizationId,
        ...(query.approvedOnly ? { status: 'APPROVED' } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { bodyText: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }, { language: 'asc' }],
      take: 400,
    });
    return rows.map((row) => this.project(row));
  }

  /**
   * Mirrors the WhatsApp Business Account's templates into the local cache.
   *
   * Templates that vanished upstream are marked `DISABLED` rather than deleted:
   * a completed campaign still points at the row that describes what it sent.
   */
  async sync(c: CallerContext) {
    this.policy.assert(c, 'campaigns.templates.sync');
    const organizationId = (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
    const channel = await this.credentials.forPlatform(
      organizationId,
      'whatsapp',
    );
    if (!channel)
      throw new DomainException(
        'channel-not-configured',
        'قناة واتساب غير مرتبطة. اربط رقم الأعمال من إعدادات القنوات.',
        503,
      );
    const wabaId = channel.businessAccountId;
    if (!wabaId)
      throw new DomainException(
        'waba-unknown',
        'لم يتم التعرف على حساب واتساب للأعمال. أعد ربط الرقم عبر تسجيل الدخول بحساب Meta.',
        422,
      );

    const assets = await this.graph.messageTemplates(
      wabaId,
      channel.accessToken,
    );
    const syncedAt = new Date();
    const seen: string[] = [];
    for (const asset of assets) {
      const parsed = parseComponents(asset.components);
      const data = {
        organizationId,
        connectionId: channel.connectionId ?? null,
        wabaId,
        providerTemplateId: asset.id,
        name: asset.name,
        language: asset.language,
        category: asset.category || 'MARKETING',
        status: STATUS_DB[asset.status?.toUpperCase()] ?? 'PENDING',
        headerKind: parsed.headerKind ?? null,
        headerText: parsed.headerText ?? null,
        bodyText: parsed.bodyText,
        footerText: parsed.footerText ?? null,
        buttons: parsed.buttons as Prisma.InputJsonValue,
        variableCount: parsePlaceholders(parsed.bodyText).length,
        headerVariableCount: parsePlaceholders(parsed.headerText ?? '').length,
        qualityScore: asset.qualityScore ?? null,
        rejectedReason: asset.rejectedReason ?? null,
        syncedAt,
      };
      const row = await this.db.whatsappTemplate.upsert({
        where: {
          organizationId_providerTemplateId: {
            organizationId,
            providerTemplateId: asset.id,
          },
        },
        create: data,
        update: data,
        select: { id: true },
      });
      seen.push(row.id);
    }
    const retired = await this.db.whatsappTemplate.updateMany({
      where: {
        organizationId,
        id: {
          notIn: seen.length ? seen : ['00000000-0000-0000-0000-000000000000'],
        },
        status: { not: 'DISABLED' },
      },
      data: { status: 'DISABLED', syncedAt },
    });
    this.logger.log(
      `Synced ${assets.length} WhatsApp templates (${retired.count} retired)`,
    );
    return {
      synced: assets.length,
      retired: retired.count,
      syncedAt: syncedAt.toISOString(),
    };
  }
}
