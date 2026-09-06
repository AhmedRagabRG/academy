import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { CampaignRecipientStatus } from '../../../../prisma/generated/client';
import {
  META_MESSAGE_STATUS_EVENT,
  type MetaMessageStatusEvent,
} from '../../../core/events/meta-message-status.event';
import { PrismaService } from '../../../database/prisma.service';

/** Which prior states a transition may advance from — later states never regress. */
const ADVANCES_FROM: Record<string, CampaignRecipientStatus[]> = {
  sent: ['PENDING', 'SENDING'],
  delivered: ['PENDING', 'SENDING', 'SENT'],
  read: ['PENDING', 'SENDING', 'SENT', 'DELIVERED'],
  failed: ['PENDING', 'SENDING', 'SENT', 'DELIVERED'],
};

/**
 * Keeps campaign delivery figures in step with the WhatsApp webhook.
 *
 * The inbox webhook publishes every provider status it receives; a status for a
 * message this module never sent simply matches no recipient. The listener sits
 * here rather than in the webhook so the inbox keeps no knowledge of campaigns.
 */
@Injectable()
export class CampaignDeliveryListener {
  private readonly logger = new Logger(CampaignDeliveryListener.name);

  constructor(private readonly db: PrismaService) {}

  @OnEvent(META_MESSAGE_STATUS_EVENT, { async: true })
  async apply(event: MetaMessageStatusEvent): Promise<void> {
    const allowed = ADVANCES_FROM[event.state];
    if (!allowed || !event.providerMessageId) return;
    try {
      const recipient = await this.db.campaignRecipient.findUnique({
        where: { providerMessageId: event.providerMessageId },
        select: { id: true, campaignId: true, status: true },
      });
      if (!recipient || !allowed.includes(recipient.status)) return;

      const at = new Date(event.occurredAt);
      const occurredAt = Number.isNaN(at.getTime()) ? new Date() : at;
      const wasDelivered = recipient.status === 'DELIVERED';

      if (event.state === 'failed') {
        await this.db.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'FAILED',
            failedAt: occurredAt,
            errorCode: event.errorCode ?? null,
            errorMessage: event.errorMessage?.slice(0, 400) ?? null,
          },
        });
        await this.db.campaign.update({
          where: { id: recipient.campaignId },
          data: { failedCount: { increment: 1 } },
        });
        return;
      }

      const status: CampaignRecipientStatus =
        event.state === 'read'
          ? 'READ'
          : event.state === 'delivered'
            ? 'DELIVERED'
            : 'SENT';
      await this.db.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status,
          ...(event.state === 'sent' ? { sentAt: occurredAt } : {}),
          ...(event.state === 'delivered' ? { deliveredAt: occurredAt } : {}),
          ...(event.state === 'read'
            ? {
                readAt: occurredAt,
                // A read receipt may arrive without a delivery one.
                ...(wasDelivered ? {} : { deliveredAt: occurredAt }),
              }
            : {}),
        },
      });
      if (event.state === 'sent') return;
      await this.db.campaign.update({
        where: { id: recipient.campaignId },
        data: {
          ...(event.state === 'delivered' || !wasDelivered
            ? { deliveredCount: { increment: 1 } }
            : {}),
          ...(event.state === 'read' ? { readCount: { increment: 1 } } : {}),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Campaign delivery update failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
