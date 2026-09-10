import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Prisma } from '../../../../prisma/generated/client';
import {
  META_MESSAGE_STATUS_EVENT,
  parseCampaignCorrelationId,
  type MetaMessageStatusEvent,
} from '../../../core/events/meta-message-status.event';
import { PrismaService } from '../../../database/prisma.service';
import {
  ChannelCredentialsService,
  type ChannelProviderCode,
} from '../channels/channel-credentials.service';
import { InboxCrmLinkService } from '../crm/inbox-crm-link.service';
import { InboxRealtimeService } from '../inbox-realtime.service';

interface IncomingAttachment {
  sourceId: string;
  kind: string;
  fileName: string;
}

interface IncomingMessage {
  channel: ChannelProviderCode;
  accountId: string;
  participantId: string;
  providerMessageId: string;
  senderName: string;
  body: string;
  sentAt: Date;
  attachments: IncomingAttachment[];
}

interface IncomingStatus {
  channel: ChannelProviderCode;
  id?: string;
  state: string;
  participantId?: string;
  watermark?: Date;
  errorCode?: string;
  errorMessage?: string;
  /** The provider's own timestamp for this status, when it reported one. */
  occurredAt?: Date;
  /** A validated campaign correlation marker, WhatsApp statuses only. */
  correlationId?: string;
}

const DELIVERY_STATES: Record<
  string,
  'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};

/**
 * Provider receipts can arrive out of order (retries, multi-region delivery).
 * A delivery state already at or past the incoming one must never be
 * overwritten, so READ/DELIVERED can't regress back to an earlier step.
 */
const REGRESSION_GUARD: Record<
  'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
  Array<'SENT' | 'DELIVERED' | 'READ' | 'FAILED'>
> = {
  SENT: ['SENT', 'DELIVERED', 'READ', 'FAILED'],
  // A later delivery receipt is stronger evidence than an earlier failure.
  DELIVERED: ['DELIVERED', 'READ'],
  READ: ['READ'],
  FAILED: ['DELIVERED', 'READ'],
};

const WHATSAPP_MEDIA_KINDS: Record<string, string> = {
  image: 'image',
  video: 'video',
  audio: 'voice',
  document: 'document',
  sticker: 'image',
};
const WHATSAPP_MEDIA_FILE_NAMES: Record<string, string> = {
  image: 'photo.jpg',
  video: 'video.mp4',
  audio: 'voice-message.ogg',
  sticker: 'sticker.webp',
};
const MESSAGING_ATTACHMENT_KINDS: Record<string, string> = {
  image: 'image',
  video: 'video',
  audio: 'voice',
  file: 'document',
};
const MESSAGING_ATTACHMENT_FILE_NAMES: Record<string, string> = {
  image: 'photo.jpg',
  video: 'video.mp4',
  audio: 'voice-message.mp3',
  file: 'file',
};

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly db: PrismaService,
    private readonly realtime: InboxRealtimeService,
    private readonly channels: ChannelCredentialsService,
    private readonly crm: InboxCrmLinkService,
    private readonly events: EventEmitter2,
  ) {}

  verifyChallenge(mode?: string, token?: string): boolean {
    const expected = this.config.get<string>('meta.verifyToken') ?? '';
    return Boolean(expected && mode === 'subscribe' && token === expected);
  }

  verifySignature(rawBody: Buffer, signature?: string): boolean {
    const secret = this.config.get<string>('meta.appSecret') ?? '';
    if (!secret || !signature?.startsWith('sha256=')) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signature.slice(7);
    if (received.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  }

  async ingest(payload: unknown): Promise<void> {
    const statuses = this.statuses(payload);
    const messages = this.messages(payload);
    for (const status of statuses) await this.applyStatus(status);
    for (const message of messages) await this.persist(message);
    if (statuses.length || messages.length) this.realtime.publish();
  }

  private channelOf(payload: unknown): ChannelProviderCode | null {
    if (!payload || typeof payload !== 'object') return null;
    const object = string((payload as Record<string, unknown>).object);
    if (object === 'whatsapp_business_account') return 'whatsapp';
    if (object === 'page') return 'messenger';
    if (object === 'instagram') return 'instagram';
    return null;
  }

  private messages(payload: unknown): IncomingMessage[] {
    const channel = this.channelOf(payload);
    if (!channel) return [];
    const root = payload as Record<string, unknown>;
    return channel === 'whatsapp'
      ? this.whatsappMessages(root)
      : this.messagingMessages(root, channel);
  }

  private whatsappMessages(root: Record<string, unknown>): IncomingMessage[] {
    const result: IncomingMessage[] = [];
    for (const entry of array(root.entry))
      for (const change of array(record(entry).changes)) {
        const value = record(record(change).value);
        const accountId = string(record(value.metadata).phone_number_id);
        const contact = record(array(value.contacts)[0]);
        for (const source of array(value.messages)) {
          const message = record(source);
          const type = string(message.type);
          const media = WHATSAPP_MEDIA_KINDS[type]
            ? record(message[type])
            : null;
          const mediaId = media ? string(media.id) : '';
          const body =
            string(record(message.text).body) ||
            (media ? string(media.caption) : '') ||
            string(record(message.button).text) ||
            string(record(record(message.interactive).button_reply).title) ||
            string(record(record(message.interactive).list_reply).title) ||
            `[${type || 'message'}]`;
          const providerMessageId = string(message.id);
          const participantId = string(message.from);
          if (!accountId || !providerMessageId || !participantId) continue;
          const attachments: IncomingAttachment[] =
            media && mediaId
              ? [
                  {
                    sourceId: mediaId,
                    kind: WHATSAPP_MEDIA_KINDS[type],
                    fileName:
                      type === 'document'
                        ? string(media.filename) || 'document'
                        : WHATSAPP_MEDIA_FILE_NAMES[type],
                  },
                ]
              : [];
          result.push({
            channel: 'whatsapp',
            accountId,
            participantId,
            providerMessageId,
            senderName: string(record(contact.profile).name) || participantId,
            body,
            sentAt: timestamp(message.timestamp),
            attachments,
          });
        }
      }
    return result;
  }

  /** Messenger and Instagram share the Messenger Platform event shape. */
  private messagingMessages(
    root: Record<string, unknown>,
    channel: 'messenger' | 'instagram',
  ): IncomingMessage[] {
    const result: IncomingMessage[] = [];
    for (const entry of array(root.entry)) {
      const accountId = string(record(entry).id);
      for (const source of array(record(entry).messaging)) {
        const event = record(source);
        const message = record(event.message);
        if (message.is_echo === true) continue;
        const providerMessageId = string(message.mid);
        const participantId = string(record(event.sender).id);
        if (!accountId || !providerMessageId || !participantId) continue;
        const rawAttachments = array(message.attachments);
        const attachments: IncomingAttachment[] = rawAttachments
          .map((raw) => record(raw))
          .map((raw) => ({
            type: string(raw.type),
            url: string(record(raw.payload).url),
            name:
              string(raw.name) || string(record(raw.payload).name) || undefined,
          }))
          .filter(
            (parsed) => MESSAGING_ATTACHMENT_KINDS[parsed.type] && parsed.url,
          )
          .map((parsed) => ({
            // Messenger supplies a signed CDN URL rather than a stable media
            // id. It is retained as provider metadata only; the UI marks the
            // attachment preview-only and never presents it as durable bytes.
            sourceId: parsed.url,
            kind: MESSAGING_ATTACHMENT_KINDS[parsed.type],
            fileName:
              parsed.type === 'file' && parsed.name
                ? parsed.name
                : MESSAGING_ATTACHMENT_FILE_NAMES[parsed.type],
          }));
        const body =
          string(message.text) ||
          (rawAttachments.length
            ? `[${string(record(rawAttachments[0]).type) || 'attachment'}]`
            : '[attachment]');
        result.push({
          channel,
          accountId,
          participantId,
          providerMessageId,
          senderName:
            channel === 'instagram'
              ? `Instagram ${participantId.slice(-6)}`
              : `Messenger ${participantId.slice(-6)}`,
          body,
          sentAt: timestamp(event.timestamp),
          attachments,
        });
      }
    }
    return result;
  }

  private statuses(payload: unknown): IncomingStatus[] {
    const channel = this.channelOf(payload);
    if (!channel) return [];
    const root = payload as Record<string, unknown>;
    if (channel !== 'whatsapp') return this.messagingStatuses(root, channel);
    const result: IncomingStatus[] = [];
    for (const entry of array(root.entry))
      for (const change of array(record(entry).changes))
        for (const source of array(record(record(change).value).statuses)) {
          const status = record(source);
          const id = string(status.id);
          const state = string(status.status);
          const failure = record(array(status.errors)[0]);
          if (id && state)
            result.push({
              channel: 'whatsapp',
              id,
              state,
              errorCode:
                typeof failure.code === 'number' ||
                typeof failure.code === 'string'
                  ? String(failure.code)
                  : undefined,
              errorMessage:
                string(record(failure.error_data).details) ||
                string(failure.title) ||
                string(failure.message) ||
                undefined,
              occurredAt: status.timestamp
                ? timestamp(status.timestamp)
                : undefined,
              correlationId: parseCampaignCorrelationId(
                status.biz_opaque_callback_data,
              ),
            });
        }
    return result;
  }

  private messagingStatuses(
    root: Record<string, unknown>,
    channel: 'messenger' | 'instagram',
  ): IncomingStatus[] {
    const result: IncomingStatus[] = [];
    for (const entry of array(root.entry))
      for (const source of array(record(entry).messaging)) {
        const event = record(source);
        for (const id of array(record(event.delivery).mids))
          if (typeof id === 'string')
            result.push({ channel, id, state: 'delivered' });
        const read = record(event.read);
        const participantId = string(record(event.sender).id);
        // Messenger reports a watermark; Instagram reports the message id.
        if (read.watermark && participantId)
          result.push({
            channel,
            state: 'read',
            participantId,
            watermark: timestamp(read.watermark),
          });
        else if (string(read.mid))
          result.push({ channel, state: 'read', id: string(read.mid) });
      }
    return result;
  }

  private async applyStatus(status: IncomingStatus): Promise<void> {
    const delivery = DELIVERY_STATES[status.state];
    if (!delivery) return;
    if (status.id) {
      await this.db.inboxMessage.updateMany({
        where: {
          providerMessageId: status.id,
          delivery: { notIn: REGRESSION_GUARD[delivery] },
        },
        data: { delivery },
      });
      // Published for whoever owns the message; a receipt for a message this
      // inbox never sent — a campaign send, say — matches nothing above.
      // Await campaign reconciliation. If a listener's database transaction
      // fails, the webhook request must fail too so Meta retries the signed
      // status instead of receiving a false 200 while campaign state drifts.
      await this.events.emitAsync(META_MESSAGE_STATUS_EVENT, {
        providerMessageId: status.id,
        state: status.state as MetaMessageStatusEvent['state'],
        occurredAt: (status.occurredAt ?? new Date()).toISOString(),
        errorCode: status.errorCode,
        errorMessage: status.errorMessage,
        ...(status.correlationId
          ? { correlationId: status.correlationId }
          : {}),
      } satisfies MetaMessageStatusEvent);
    }
    if (delivery === 'READ' && status.participantId && status.watermark)
      await this.db.inboxMessage.updateMany({
        where: {
          direction: 'OUTGOING',
          sentAt: { lte: status.watermark },
          delivery: { notIn: REGRESSION_GUARD.READ },
          conversation: {
            providerThreadId: status.participantId,
            platform: { code: status.channel },
          },
        },
        data: { delivery: 'READ' },
      });
  }

  private threadIdentity(input: IncomingMessage): string {
    if (input.channel === 'whatsapp')
      return input.participantId.replace(/\D/g, '');
    return `${input.channel}:${input.participantId}`;
  }

  /**
   * Meta redelivers webhooks that don't ack fast enough or that time out on
   * its side, so the same payload can reach this endpoint twice — sometimes
   * concurrently. `providerMessageId` is the idempotency key; the customer
   * and conversation upserts plus the message insert run in one transaction
   * so a duplicate delivery either fully lands or is fully rolled back by the
   * unique-constraint violation on `providerMessageId`, never half-applied.
   *
   * A duplicate can also mean the *first* delivery's transaction committed
   * but the CRM link after it (outside the transaction) never ran — a crash,
   * a transient error, or Meta simply retrying before the link finished. The
   * retry must not skip the conversation/customer write again (that's what
   * the transaction already guarantees), but it must still recover the
   * customer the winning write created and re-run the idempotent CRM link so
   * that failure never leaves a contact permanently unlinked.
   */
  private async persist(input: IncomingMessage): Promise<void> {
    const route = await this.channels.forInbound(
      input.channel,
      input.accountId,
    );
    if (!route) {
      this.logger.warn(
        `Dropped ${input.channel} message for unlinked account ${input.accountId}`,
      );
      return;
    }
    const normalizedPhone = this.threadIdentity(input);
    const now = input.sentAt;
    const message = {
      direction: 'INCOMING' as const,
      authorType: 'CUSTOMER' as const,
      senderName: input.senderName,
      body: input.body,
      sentAt: now,
      delivery: 'RECEIVED' as const,
      providerMessageId: input.providerMessageId,
      ...(input.attachments.length
        ? {
            attachments: {
              create: input.attachments.map((attachment) => ({
                sourceId: attachment.sourceId,
                kind: attachment.kind,
                fileName: attachment.fileName,
              })),
            },
          }
        : {}),
    };
    let customerId: string;
    try {
      customerId = await this.db.$transaction(async (tx) => {
        const customer = await tx.inboxCustomer.upsert({
          where: {
            organizationId_normalizedPhone: {
              organizationId: route.organizationId,
              normalizedPhone,
            },
          },
          update: { name: input.senderName, lastActivityAt: now },
          create: {
            organizationId: route.organizationId,
            name: input.senderName,
            normalizedName: input.senderName.toLocaleLowerCase(),
            phone: input.participantId,
            normalizedPhone,
            firstContactAt: now,
            lastActivityAt: now,
          },
        });
        const conversation = await tx.inboxConversation.upsert({
          where: {
            platformId_providerThreadId: {
              platformId: route.platformId,
              providerThreadId: input.participantId,
            },
          },
          update: {
            status: 'OPEN',
            deletedAt: null,
            lastMessage: input.body,
            lastActivityAt: now,
            unreadCount: { increment: 1 },
            version: { increment: 1 },
            messages: { create: message },
          },
          create: {
            organizationId: route.organizationId,
            customerId: customer.id,
            platformId: route.platformId,
            providerThreadId: input.participantId,
            status: 'OPEN',
            unreadCount: 1,
            lastMessage: input.body,
            lastActivityAt: now,
            messages: { create: message },
          },
        });
        // Inside this transaction on purpose. The P2002 on providerMessageId
        // aborts the whole transaction for a duplicate delivery, which rolls
        // this increment back for free. Moved to a post-commit hook it would
        // double-increment on every Meta retry and silently fence out a valid
        // AI turn.
        await tx.conversationAiState.updateMany({
          where: { conversationId: conversation.id },
          data: { turnSeq: { increment: 1 } },
        });
        return customer.id;
      });
    } catch (error) {
      if (!isDuplicateProviderMessage(error)) throw error;
      // A unique-conflict only proves that this provider id already exists.
      // Recover through that exact message and verify its route/thread before
      // repairing CRM; looking up by the incoming identity alone could attach
      // the wrong customer if a provider ever violated global-id uniqueness.
      const existingMessage = await this.db.inboxMessage.findUnique({
        where: { providerMessageId: input.providerMessageId },
        select: {
          conversation: {
            select: {
              customerId: true,
              organizationId: true,
              platformId: true,
              providerThreadId: true,
            },
          },
        },
      });
      const existingConversation = existingMessage?.conversation;
      if (
        !existingConversation ||
        existingConversation.organizationId !== route.organizationId ||
        existingConversation.platformId !== route.platformId ||
        existingConversation.providerThreadId !== input.participantId
      ) {
        this.logger.warn(
          `Duplicate webhook ${input.providerMessageId} could not be correlated to ${input.channel}:${input.accountId}:${input.participantId}; CRM repair skipped`,
        );
        return;
      }
      customerId = existingConversation.customerId;
    }
    const platform = await this.db.inboxPlatform.findUnique({
      where: { id: route.platformId },
      select: { label: true },
    });
    await this.crm.link({
      organizationId: route.organizationId,
      customerId,
      identity: normalizedPhone,
      name: input.senderName,
      phone: input.participantId,
      platformCode: input.channel,
      platformLabel: platform?.label,
      occurredAt: now,
    });
  }
}

const isDuplicateProviderMessage = (error: unknown): boolean => {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  )
    return false;
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  return Array.isArray(target) && target.includes('providerMessageId');
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const string = (value: unknown): string =>
  typeof value === 'string' ? value : '';
const timestamp = (value: unknown): Date => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return new Date();
  return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric);
};
