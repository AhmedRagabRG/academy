import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Campaign,
  WhatsappTemplate,
} from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import { parsePlaceholders } from '../templates/template-parsing';
import {
  TemplateSendError,
  WhatsappTemplateSender,
} from './whatsapp-template.sender';

interface ClaimedRecipient {
  id: string;
  normalizedPhone: string;
  variables: string[];
  headerVariables: string[];
  attempts: number;
}

const MAX_ATTEMPTS = 3;
/** A row left `SENDING` this long belonged to a process that died mid-send. */
const STALE_SENDING_MS = 5 * 60 * 1000;

/**
 * The campaign worker.
 *
 * `CampaignRecipient` is the queue. Each tick claims a slice of due rows with
 * `FOR UPDATE SKIP LOCKED`, so several application instances can run this loop
 * against one database without ever sending the same recipient twice, and a
 * restart resumes exactly where the previous process stopped.
 */
@Injectable()
export class CampaignDispatcherService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CampaignDispatcherService.name);
  private timer?: NodeJS.Timeout;
  private ticking = false;

  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
    private readonly sender: WhatsappTemplateSender,
  ) {}

  private get intervalMs(): number {
    return this.config.get<number>('campaigns.tickMs') ?? 5000;
  }

  onModuleInit(): void {
    if (this.config.get<boolean>('campaigns.dispatchEnabled') === false) {
      this.logger.log('Campaign dispatcher disabled by configuration');
      return;
    }
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    // Never hold the process open for the sake of the poll loop.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One pass of the loop. Public so a test can drive it without waiting. */
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.recoverStale();
      await this.promoteScheduled();
      const campaigns = await this.db.campaign.findMany({
        where: { status: 'RUNNING', deletedAt: null },
        include: { template: true },
        orderBy: { startedAt: 'asc' },
        take: 10,
      });
      for (const campaign of campaigns) await this.advance(campaign);
    } catch (error) {
      this.logger.error(
        `Campaign dispatch tick failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this.ticking = false;
    }
  }

  private async recoverStale(): Promise<void> {
    await this.db.campaignRecipient.updateMany({
      where: {
        status: 'SENDING',
        updatedAt: { lt: new Date(Date.now() - STALE_SENDING_MS) },
      },
      data: { status: 'PENDING' },
    });
  }

  private async promoteScheduled(): Promise<void> {
    const due = await this.db.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        deletedAt: null,
        scheduledAt: { lte: new Date() },
      },
      select: { id: true, startedAt: true },
      take: 20,
    });
    for (const campaign of due) {
      await this.db.campaign.update({
        where: { id: campaign.id },
        data: {
          status: 'RUNNING',
          startedAt: campaign.startedAt ?? new Date(),
          version: { increment: 1 },
        },
      });
      await this.db.campaignEvent.create({
        data: {
          campaignId: campaign.id,
          kind: 'STARTED',
          label: 'بدأ الإرسال في الموعد المجدول',
          actorName: 'النظام',
        },
      });
    }
  }

  /** How many messages this campaign may hand to Meta in one tick. */
  private budget(campaign: Campaign): number {
    const cap = this.config.get<number>('campaigns.maxPerTick') ?? 100;
    const share = Math.round(
      (campaign.throttlePerMinute * this.intervalMs) / 60_000,
    );
    return Math.max(1, Math.min(cap, share));
  }

  private async claim(
    campaignId: string,
    limit: number,
  ): Promise<ClaimedRecipient[]> {
    return this.db.$queryRaw<ClaimedRecipient[]>`
      UPDATE "CampaignRecipient" AS r
      SET status = 'SENDING', attempts = r.attempts + 1, "updatedAt" = now()
      WHERE r.id IN (
        SELECT c.id
        FROM "CampaignRecipient" c
        WHERE c."campaignId" = ${campaignId}::uuid
          AND c.status = 'PENDING'
          AND c."availableAt" <= now()
        ORDER BY c."createdAt", c.id
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING r.id, r."normalizedPhone", r.variables, r."headerVariables", r.attempts
    `;
  }

  private async advance(
    campaign: Campaign & { template: WhatsappTemplate },
  ): Promise<void> {
    const claimed = await this.claim(campaign.id, this.budget(campaign));
    if (!claimed.length) {
      await this.completeIfDrained(campaign.id);
      return;
    }

    const bodyTokens = parsePlaceholders(campaign.template.bodyText);
    const headerTokens = parsePlaceholders(campaign.template.headerText ?? '');
    let channel;
    try {
      channel = await this.sender.channel(campaign.organizationId);
    } catch (error) {
      // The whole campaign is blocked, not one recipient: park the batch and
      // pause so an operator sees why nothing is moving.
      await this.db.campaignRecipient.updateMany({
        where: { id: { in: claimed.map((row) => row.id) } },
        data: { status: 'PENDING', availableAt: new Date(Date.now() + 60_000) },
      });
      await this.pauseWithError(
        campaign.id,
        error instanceof Error ? error.message : 'تعذر الوصول إلى قناة واتساب',
      );
      return;
    }

    let sent = 0;
    let failed = 0;
    for (const recipient of claimed) {
      try {
        const providerMessageId = await this.sender.send(
          {
            organizationId: campaign.organizationId,
            to: recipient.normalizedPhone,
            templateName: campaign.template.name,
            language: campaign.template.language,
            bodyTokens,
            bodyValues: recipient.variables,
            headerTokens,
            headerValues: recipient.headerVariables,
          },
          channel,
        );
        await this.db.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'SENT',
            providerMessageId,
            sentAt: new Date(),
            errorCode: null,
            errorMessage: null,
          },
        });
        sent += 1;
      } catch (error) {
        const failure =
          error instanceof TemplateSendError
            ? error
            : new TemplateSendError(
                'unexpected',
                error instanceof Error ? error.message : 'خطأ غير متوقع',
                false,
              );
        const retry = failure.retryable && recipient.attempts < MAX_ATTEMPTS;
        await this.db.campaignRecipient.update({
          where: { id: recipient.id },
          data: retry
            ? {
                status: 'PENDING',
                availableAt: new Date(Date.now() + recipient.attempts * 60_000),
                errorCode: failure.code,
                errorMessage: failure.message.slice(0, 400),
              }
            : {
                status: 'FAILED',
                failedAt: new Date(),
                errorCode: failure.code,
                errorMessage: failure.message.slice(0, 400),
              },
        });
        if (!retry) failed += 1;
      }
    }

    if (sent || failed)
      await this.db.campaign.update({
        where: { id: campaign.id },
        data: {
          sentCount: { increment: sent },
          failedCount: { increment: failed },
        },
      });
    await this.completeIfDrained(campaign.id);
  }

  private async pauseWithError(
    campaignId: string,
    message: string,
  ): Promise<void> {
    await this.db.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'PAUSED',
        lastError: message.slice(0, 400),
        version: { increment: 1 },
      },
    });
    await this.db.campaignEvent.create({
      data: {
        campaignId,
        kind: 'DELIVERY_FAILED',
        label: 'أُوقفت الحملة مؤقتًا بسبب تعذر الإرسال',
        actorName: 'النظام',
        payload: { message },
      },
    });
  }

  private async completeIfDrained(campaignId: string): Promise<void> {
    const outstanding = await this.db.campaignRecipient.count({
      where: { campaignId, status: { in: ['PENDING', 'SENDING'] } },
    });
    if (outstanding) return;
    const campaign = await this.db.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (campaign?.status !== 'RUNNING') return;
    await this.db.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await this.db.campaignEvent.create({
      data: {
        campaignId,
        kind: 'COMPLETED',
        label: 'اكتمل إرسال الحملة',
        actorName: 'النظام',
      },
    });
  }
}
