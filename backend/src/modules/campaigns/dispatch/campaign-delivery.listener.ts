import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type {
  CampaignRecipientStatus,
  Prisma,
} from '../../../../prisma/generated/client';
import {
  META_MESSAGE_STATUS_EVENT,
  type MetaMessageStatusEvent,
} from '../../../core/events/meta-message-status.event';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Which prior states a transition may advance from — later states never
 * regress, except that a confirmed delivery/read is stronger evidence than
 * an earlier failure and may supersede it. `UNCERTAIN` is reconcilable from
 * by every terminal state, since it represents doubt, not a known outcome.
 */
const ADVANCES_FROM: Record<string, CampaignRecipientStatus[]> = {
  sent: ['PENDING', 'SENDING', 'UNCERTAIN'],
  delivered: ['PENDING', 'SENDING', 'SENT', 'FAILED', 'UNCERTAIN'],
  read: ['PENDING', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'UNCERTAIN'],
  failed: ['PENDING', 'SENDING', 'SENT', 'UNCERTAIN'],
};

interface RecipientRef {
  id: string;
  campaignId: string;
  status: CampaignRecipientStatus;
  providerMessageId: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
}

/**
 * Keeps campaign delivery figures in step with the WhatsApp webhook.
 *
 * The inbox webhook publishes every provider status it receives; a status for
 * a message this module never sent simply matches no recipient. The listener
 * sits here rather than in the webhook so the inbox keeps no knowledge of
 * campaigns.
 *
 * Every write below is a conditional `updateMany` keyed on the exact state
 * that was read, so two concurrent deliveries of the same webhook event —
 * or out-of-order events — resolve into one winner. A loser re-reads and
 * recomputes its counter deltas from the newly committed state.
 */
@Injectable()
export class CampaignDeliveryListener {
  private readonly logger = new Logger(CampaignDeliveryListener.name);

  constructor(private readonly db: PrismaService) {}

  @OnEvent(META_MESSAGE_STATUS_EVENT, { async: true, suppressErrors: false })
  async apply(event: MetaMessageStatusEvent): Promise<void> {
    const allowed = ADVANCES_FROM[event.state];
    if (!allowed) return;
    try {
      const at = new Date(event.occurredAt);
      const occurredAt = Number.isNaN(at.getTime()) ? new Date() : at;
      // A competing receipt may advance the row after our read. Match the
      // exact prior state, then re-read and recompute deltas if we lose that
      // race. Broad "status IN (...)" guards would let a stale snapshot
      // double-increment delivery/read counters.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const recipient = await this.findRecipient(event);
        if (!recipient || !allowed.includes(recipient.status)) return;
        if (await this.writeGuarded(recipient, event, occurredAt)) return;
      }
      throw new Error('campaign receipt transition remained contended');
    } catch (error) {
      this.logger.warn(
        `Campaign delivery update failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /** Looks up the target row by `providerMessageId` first; falls back to the
   * `correlationId` WhatsApp echoes back, so a row that never recorded a
   * provider message id (an `UNCERTAIN` send, say) can still be reconciled. */
  private async findRecipient(
    event: MetaMessageStatusEvent,
  ): Promise<RecipientRef | null> {
    const select = {
      id: true,
      campaignId: true,
      status: true,
      providerMessageId: true,
      sentAt: true,
      deliveredAt: true,
    } as const;
    let byProviderId: RecipientRef | null = null;
    if (event.providerMessageId) {
      byProviderId = await this.db.campaignRecipient.findUnique({
        where: { providerMessageId: event.providerMessageId },
        select,
      });
    }
    const byCorrelation = event.correlationId
      ? await this.db.campaignRecipient.findUnique({
          where: { correlationId: event.correlationId },
          select,
        })
      : null;
    if (byProviderId && byCorrelation && byProviderId.id !== byCorrelation.id) {
      this.logger.warn(
        `Ignored campaign receipt with conflicting provider/correlation identifiers`,
      );
      return null;
    }
    return byProviderId ?? byCorrelation;
  }

  /** Conditioned on the row still being in an allowed prior state, and on
   * landing every counter increment in the same transaction as that write,
   * so the cumulative counters can never drift from the write that earned
   * them — nothing commits unless the guarded update actually won. */
  private async writeGuarded(
    recipient: RecipientRef,
    event: MetaMessageStatusEvent,
    occurredAt: Date,
  ): Promise<boolean> {
    const acceptedNow = recipient.sentAt === null;
    const wasDelivered = recipient.deliveredAt !== null;
    const backfillProviderMessageId =
      !recipient.providerMessageId && event.providerMessageId
        ? { providerMessageId: event.providerMessageId }
        : {};
    const data: Prisma.CampaignRecipientUpdateManyMutationInput = {
      claimToken: null,
      leaseExpiresAt: null,
      ...backfillProviderMessageId,
      ...(acceptedNow ? { sentAt: occurredAt } : {}),
    };
    const counters: Prisma.CampaignUpdateInput = {
      ...(acceptedNow ? { sentCount: { increment: 1 } } : {}),
      ...(recipient.status === 'UNCERTAIN'
        ? { uncertainCount: { decrement: 1 } }
        : {}),
      ...(recipient.status === 'FAILED'
        ? { failedCount: { decrement: 1 } }
        : {}),
    };

    if (event.state === 'failed') {
      Object.assign(data, {
        status: 'FAILED',
        failedAt: occurredAt,
        errorCode: event.errorCode ?? null,
        errorMessage: event.errorMessage?.slice(0, 400) ?? null,
      });
      Object.assign(counters, { failedCount: { increment: 1 } });
    } else {
      const status: CampaignRecipientStatus =
        event.state === 'read'
          ? 'READ'
          : event.state === 'delivered'
            ? 'DELIVERED'
            : 'SENT';
      Object.assign(data, {
        status,
        errorCode: null,
        errorMessage: null,
        ...(event.state === 'delivered' ? { deliveredAt: occurredAt } : {}),
        ...(event.state === 'read'
          ? {
              readAt: occurredAt,
              ...(wasDelivered ? {} : { deliveredAt: occurredAt }),
            }
          : {}),
      });
      Object.assign(counters, {
        ...(event.state === 'delivered' ||
        (event.state === 'read' && !wasDelivered)
          ? { deliveredCount: { increment: 1 } }
          : {}),
        ...(event.state === 'read' ? { readCount: { increment: 1 } } : {}),
      });
    }

    return this.db.$transaction(async (tx) => {
      // Parent-first matches pause/cancel and dispatcher result writes. The
      // consistent hierarchy prevents an AB/BA deadlock between a recipient
      // receipt and an operator lifecycle transition.
      await tx.$queryRaw`
        SELECT id FROM "Campaign"
        WHERE id = ${recipient.campaignId}::uuid
        FOR UPDATE
      `;
      const result = await tx.campaignRecipient.updateMany({
        where: { id: recipient.id, status: recipient.status },
        data,
      });
      if (!result.count) return false;
      if (Object.keys(counters).length)
        await tx.campaign.update({
          where: { id: recipient.campaignId },
          data: counters,
        });
      return true;
    });
  }
}
