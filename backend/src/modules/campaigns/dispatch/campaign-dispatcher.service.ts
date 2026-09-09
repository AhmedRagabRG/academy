import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type {
  Campaign,
  Prisma,
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
  correlationId: string;
}

interface StartedRecipient extends ClaimedRecipient {
  attempts: number;
}

/** Bounded exponential backoff for an explicit, provider-confirmed refusal
 * that said "try again later" — never applied to an ambiguous outcome. */
export const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 30 * 60_000;
export const retryBackoffMs = (attempts: number): number =>
  Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));

/** How long a claim may sit before a worker that died mid-send is assumed
 * gone. Generous relative to a Graph API round trip plus its own retries. */
const LEASE_MS = 2 * 60_000;
/** The fixed window the persistent, cross-instance throttle gate spends
 * `throttlePerMinute` against. */
const THROTTLE_WINDOW_MS = 60_000;

const errorMessageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The campaign worker.
 *
 * `CampaignRecipient` is the queue. Each tick claims a slice of due rows with
 * `FOR UPDATE SKIP LOCKED` under a per-claim ownership token, so several
 * application instances can run this loop against one database without ever
 * sending the same recipient twice, and a restart resumes exactly where the
 * previous process stopped.
 *
 * Meta's Cloud API gives no guaranteed client idempotency key, so a crash
 * between issuing the request and persisting its result is genuinely
 * outcome-unknown. This worker never resends in that case: a row only moves
 * from `SENDING` back to `PENDING` if the Graph API request never started
 * (`requestStartedAt` is still null); once it started, a lapsed lease lands
 * the row in the terminal `UNCERTAIN` state instead.
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
        `Campaign dispatch tick failed: ${errorMessageOf(error)}`,
      );
    } finally {
      this.ticking = false;
    }
  }

  /**
   * Reclaims abandoned claims. A claim never handed to Meta is simply
   * re-queued; a claim that may have already reached Meta is never silently
   * retried — it rests as `UNCERTAIN` so a webhook or operator can resolve
   * it honestly.
   */
  private async recoverStale(): Promise<void> {
    await this.db.campaignRecipient.updateMany({
      where: {
        status: 'SENDING',
        requestStartedAt: null,
        leaseExpiresAt: { not: null, lt: new Date() },
      },
      data: { status: 'PENDING', claimToken: null, leaseExpiresAt: null },
    });

    const staleCampaigns = await this.db.campaignRecipient.findMany({
      where: {
        status: 'SENDING',
        OR: [
          {
            requestStartedAt: { not: null },
            leaseExpiresAt: { lt: new Date() },
          },
          { leaseExpiresAt: null },
        ],
      },
      select: { campaignId: true },
      distinct: ['campaignId'],
      take: 100,
    });
    for (const { campaignId } of staleCampaigns)
      await this.db.$transaction(async (tx) => {
        await this.lockCampaign(tx, campaignId);
        const resolved = await tx.campaignRecipient.updateMany({
          where: {
            campaignId,
            status: 'SENDING',
            OR: [
              {
                requestStartedAt: { not: null },
                leaseExpiresAt: { lt: new Date() },
              },
              { leaseExpiresAt: null },
            ],
          },
          data: {
            status: 'UNCERTAIN',
            uncertainAt: new Date(),
            claimToken: null,
            leaseExpiresAt: null,
            errorCode: 'uncertain-outcome',
            errorMessage: 'لم يتأكد وصول الرسالة بعد انتهاء مهلة المعالجة',
          },
        });
        if (!resolved.count) return;
        await tx.campaign.update({
          where: { id: campaignId },
          data: { uncertainCount: { increment: resolved.count } },
        });
      });
  }

  /** All transactions that touch both parent and recipient rows use this
   * parent-first hierarchy, matching operator pause/cancel and preventing an
   * AB/BA deadlock under concurrent status writes. */
  private async lockCampaign(
    tx: Prisma.TransactionClient,
    campaignId: string,
  ): Promise<void> {
    await tx.$queryRaw`
      SELECT id FROM "Campaign" WHERE id = ${campaignId}::uuid FOR UPDATE
    `;
  }

  /** Guarded so two workers racing the same due campaign create one event. */
  private async promoteScheduled(): Promise<void> {
    const due = await this.db.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        deletedAt: null,
        scheduledAt: { lte: new Date() },
      },
      select: { id: true },
      take: 20,
    });
    for (const campaign of due) {
      await this.db.$transaction(async (tx) => {
        const promoted = await tx.campaign.updateMany({
          where: { id: campaign.id, status: 'SCHEDULED', deletedAt: null },
          data: {
            status: 'RUNNING',
            startedAt: new Date(),
            version: { increment: 1 },
          },
        });
        if (!promoted.count) return;
        await tx.campaignEvent.create({
          data: {
            campaignId: campaign.id,
            kind: 'STARTED',
            label: 'بدأ الإرسال في الموعد المجدول',
            actorName: 'النظام',
          },
        });
      });
    }
  }

  /** How many messages this campaign may hand to Meta in one tick, before
   * the persistent throttle gate clips it to what is actually left. */
  private budget(campaign: Campaign): number {
    const cap = this.config.get<number>('campaigns.maxPerTick') ?? 100;
    const share = Math.round(
      (campaign.throttlePerMinute * this.intervalMs) / 60_000,
    );
    return Math.max(1, Math.min(cap, share));
  }

  /**
   * Atomically reserves up to `want` sends from this campaign's fixed
   * 60-second throttle window, rolling the window over first if it has
   * expired. One UPDATE, row-locked, so concurrent instances each get a
   * correct share rather than each independently believing the full budget
   * is free.
   */
  private async reserveThrottleBudget(
    campaignId: string,
    want: number,
  ): Promise<number> {
    if (want <= 0) return 0;
    const rows = await this.db.$queryRaw<Array<{ reserved: number }>>`
      WITH window_state AS (
        SELECT id,
          CASE
            WHEN now() - "throttleWindowStartedAt" >= (interval '1 millisecond' * ${THROTTLE_WINDOW_MS})
            THEN now() ELSE "throttleWindowStartedAt"
          END AS started,
          CASE
            WHEN now() - "throttleWindowStartedAt" >= (interval '1 millisecond' * ${THROTTLE_WINDOW_MS})
            THEN 0 ELSE "throttleWindowCount"
          END AS used,
          "throttlePerMinute" AS cap
        FROM "Campaign"
        WHERE id = ${campaignId}::uuid
          AND status = 'RUNNING'
          AND "deletedAt" IS NULL
        FOR UPDATE
      ),
      reservation AS (
        SELECT id, started, used,
          LEAST(${want}::int, GREATEST(cap - used, 0)) AS reserved
        FROM window_state
      )
      UPDATE "Campaign" c
      SET "throttleWindowStartedAt" = r.started,
          "throttleWindowCount" = r.used + r.reserved
      FROM reservation r
      WHERE c.id = r.id
      RETURNING r.reserved::int AS reserved
    `;
    return rows[0]?.reserved ?? 0;
  }

  private async claim(
    campaignId: string,
    limit: number,
    token: string,
  ): Promise<ClaimedRecipient[]> {
    if (limit <= 0) return [];
    return this.db.$queryRaw<ClaimedRecipient[]>`
      UPDATE "CampaignRecipient" AS r
      SET status = 'SENDING',
          "claimToken" = ${token}::uuid,
          "leaseExpiresAt" = now() + (interval '1 millisecond' * ${LEASE_MS}),
          "requestStartedAt" = NULL,
          "updatedAt" = now()
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
      RETURNING r.id, r."normalizedPhone", r.variables, r."headerVariables", r."correlationId"
    `;
  }

  /**
   * The point of no automatic return: marks a claimed row as "the Graph API
   * request is about to be issued", but only if this worker still owns the
   * lease and the campaign has not been paused or cancelled underneath it.
   * Rows that fail this check must never be sent.
   */
  private async markRequestStarted(
    id: string,
    token: string,
  ): Promise<number | null> {
    const rows = await this.db.$queryRaw<Array<{ attempts: number }>>`
      UPDATE "CampaignRecipient" AS r
      SET "requestStartedAt" = now(),
          attempts = r.attempts + 1,
          "leaseExpiresAt" = now() + (interval '1 millisecond' * ${LEASE_MS}),
          "updatedAt" = now()
      WHERE r.id = ${id}::uuid
        AND r."claimToken" = ${token}::uuid
        AND r.status = 'SENDING'
        AND r."requestStartedAt" IS NULL
        AND r."leaseExpiresAt" > now()
        AND EXISTS (
          SELECT 1 FROM "Campaign" cm
          WHERE cm.id = r."campaignId"
            AND cm.status = 'RUNNING'
            AND cm."deletedAt" IS NULL
        )
      RETURNING r.attempts
    `;
    return rows[0]?.attempts ?? null;
  }

  /** A row that never got to start its request is always safe to let go of.
   * Paused work returns to the queue; cancelled work is skipped outright. */
  private async releaseUnstarted(
    campaignId: string,
    ids: readonly string[],
    token: string,
  ): Promise<void> {
    if (!ids.length) return;
    const campaign = await this.db.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (campaign?.status === 'RUNNING') return; // lost a benign lease race
    const data =
      campaign?.status === 'CANCELLED'
        ? {
            status: 'SKIPPED' as const,
            errorCode: 'cancelled',
            claimToken: null,
            leaseExpiresAt: null,
          }
        : {
            status: 'PENDING' as const,
            claimToken: null,
            leaseExpiresAt: null,
          };
    await this.db.campaignRecipient.updateMany({
      where: {
        id: { in: [...ids] },
        claimToken: token,
        requestStartedAt: null,
      },
      data,
    });
  }

  /**
   * Persists a confirmed send. The external side effect already happened by
   * the time this runs, so a database failure here must never be treated as
   * a send failure: the caller logs and leaves the row `SENDING` to be
   * healed into `UNCERTAIN` by `recoverStale`, or reconciled by a webhook.
   */
  private async recordSent(
    campaignId: string,
    recipientId: string,
    token: string,
    providerMessageId: string,
  ): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      await this.lockCampaign(tx, campaignId);
      const sentData = {
        status: 'SENT' as const,
        providerMessageId,
        sentAt: new Date(),
        errorCode: null,
        errorMessage: null,
        claimToken: null,
        leaseExpiresAt: null,
      };
      const result = await tx.campaignRecipient.updateMany({
        where: { id: recipientId, claimToken: token, status: 'SENDING' },
        data: sentData,
      });
      if (result.count) {
        await tx.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });
        return true;
      }

      // The lease may have just lapsed under us — a concurrent stale sweep
      // could already have moved this row to `UNCERTAIN`. We now know the
      // true outcome, so heal it rather than leaving a confirmed send stuck
      // as uncertain. Never match DELIVERED/READ: a webhook may have already
      // advanced the row and must not be regressed to SENT.
      const healed = await tx.campaignRecipient.updateMany({
        where: {
          id: recipientId,
          status: 'UNCERTAIN',
          providerMessageId: null,
        },
        data: sentData,
      });
      if (!healed.count) return false;
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
          uncertainCount: { decrement: 1 },
        },
      });
      return true;
    });
  }

  /** Writes the resolution of a failed send attempt, coupled atomically with
   * its campaign counter so the two can never drift apart. */
  private async writeOutcome(
    campaignId: string,
    recipientId: string,
    token: string,
    data: Prisma.CampaignRecipientUpdateManyMutationInput,
    counterField: 'failedCount' | 'uncertainCount' | null,
  ): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      await this.lockCampaign(tx, campaignId);
      const result = await tx.campaignRecipient.updateMany({
        where: { id: recipientId, claimToken: token, status: 'SENDING' },
        data,
      });
      if (!result.count) return false;
      if (counterField === 'failedCount')
        await tx.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      else if (counterField === 'uncertainCount')
        await tx.campaign.update({
          where: { id: campaignId },
          data: { uncertainCount: { increment: 1 } },
        });
      return true;
    });
  }

  /** Classifies and resolves a send failure. Never retries an ambiguous
   * outcome — the one hard rule the rest of this worker exists to enforce. */
  private async handleSendFailure(
    campaignId: string,
    recipient: StartedRecipient,
    token: string,
    error: unknown,
  ): Promise<void> {
    const failure =
      error instanceof TemplateSendError
        ? error
        : new TemplateSendError(
            'unexpected',
            errorMessageOf(error),
            'ambiguous',
          );
    const errorCode = failure.code;
    const errorMessage = failure.message.slice(0, 400);

    if (failure.outcome === 'ambiguous') {
      await this.writeOutcome(
        campaignId,
        recipient.id,
        token,
        {
          status: 'UNCERTAIN',
          uncertainAt: new Date(),
          errorCode,
          errorMessage,
          claimToken: null,
          leaseExpiresAt: null,
        },
        'uncertainCount',
      );
      return;
    }

    if (
      failure.outcome === 'explicit-retryable' &&
      recipient.attempts < MAX_ATTEMPTS
    ) {
      await this.writeOutcome(
        campaignId,
        recipient.id,
        token,
        {
          status: 'PENDING',
          availableAt: new Date(
            Date.now() + retryBackoffMs(recipient.attempts),
          ),
          errorCode,
          errorMessage,
          claimToken: null,
          leaseExpiresAt: null,
          requestStartedAt: null,
        },
        null,
      );
      return;
    }

    // Either an explicit, permanent refusal, or an explicitly-retryable one
    // that has exhausted its attempts.
    await this.writeOutcome(
      campaignId,
      recipient.id,
      token,
      {
        status: 'FAILED',
        failedAt: new Date(),
        errorCode,
        errorMessage,
        claimToken: null,
        leaseExpiresAt: null,
      },
      'failedCount',
    );
  }

  private async advance(
    campaign: Campaign & { template: WhatsappTemplate },
  ): Promise<void> {
    const reserved = await this.reserveThrottleBudget(
      campaign.id,
      this.budget(campaign),
    );
    if (reserved > 0) {
      const token = randomUUID();
      const claimed = await this.claim(campaign.id, reserved, token);
      if (claimed.length) await this.process(campaign, claimed, token);
    }
    await this.completeIfDrained(campaign.id);
  }

  private async process(
    campaign: Campaign & { template: WhatsappTemplate },
    claimed: ClaimedRecipient[],
    token: string,
  ): Promise<void> {
    const bodyTokens = parsePlaceholders(campaign.template.bodyText);
    const headerTokens = parsePlaceholders(campaign.template.headerText ?? '');
    let channel;
    try {
      channel = await this.sender.channel(campaign.organizationId);
    } catch (error) {
      // The whole campaign is blocked, not one recipient: release the claim
      // and pause so an operator sees why nothing is moving.
      await this.pauseWithError(
        campaign.id,
        error instanceof Error ? error.message : 'تعذر الوصول إلى قناة واتساب',
      );
      await this.releaseUnstarted(
        campaign.id,
        claimed.map((row) => row.id),
        token,
      );
      return;
    }

    for (const recipient of claimed) {
      const attempts = await this.markRequestStarted(recipient.id, token);
      if (attempts === null) {
        await this.releaseUnstarted(campaign.id, [recipient.id], token);
        continue;
      }
      let providerMessageId: string;
      try {
        providerMessageId = await this.sender.send(
          {
            organizationId: campaign.organizationId,
            to: recipient.normalizedPhone,
            templateName: campaign.template.name,
            language: campaign.template.language,
            bodyTokens,
            bodyValues: recipient.variables,
            headerTokens,
            headerValues: recipient.headerVariables,
            correlationId: recipient.correlationId,
          },
          channel,
        );
      } catch (error) {
        await this.handleSendFailure(
          campaign.id,
          { ...recipient, attempts },
          token,
          error,
        );
        continue;
      }
      // The external side effect already happened; see `recordSent`.
      try {
        await this.recordSent(
          campaign.id,
          recipient.id,
          token,
          providerMessageId,
        );
      } catch (error) {
        this.logger.error(
          `Persisting a confirmed WhatsApp send failed for recipient ${recipient.id}: ${errorMessageOf(error)}`,
        );
      }
    }
  }

  private async pauseWithError(
    campaignId: string,
    message: string,
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const paused = await tx.campaign.updateMany({
        where: { id: campaignId, status: 'RUNNING', deletedAt: null },
        data: {
          status: 'PAUSED',
          lastError: message.slice(0, 400),
          version: { increment: 1 },
        },
      });
      if (!paused.count) return;
      await tx.campaignRecipient.updateMany({
        where: {
          campaignId,
          status: 'SENDING',
          requestStartedAt: null,
        },
        data: { status: 'PENDING', claimToken: null, leaseExpiresAt: null },
      });
      await tx.campaignEvent.create({
        data: {
          campaignId,
          kind: 'DELIVERY_FAILED',
          label: 'أُوقفت الحملة مؤقتًا بسبب تعذر الإرسال',
          actorName: 'النظام',
          payload: { message },
        },
      });
    });
  }

  /** Guarded so two workers that both see a drained queue create one event. */
  private async completeIfDrained(campaignId: string): Promise<void> {
    const outstanding = await this.db.campaignRecipient.count({
      where: { campaignId, status: { in: ['PENDING', 'SENDING'] } },
    });
    if (outstanding) return;
    await this.db.$transaction(async (tx) => {
      const completed = await tx.campaign.updateMany({
        where: { id: campaignId, status: 'RUNNING', deletedAt: null },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (!completed.count) return;
      await tx.campaignEvent.create({
        data: {
          campaignId,
          kind: 'COMPLETED',
          label: 'اكتمل إرسال الحملة',
          actorName: 'النظام',
        },
      });
    });
  }
}
