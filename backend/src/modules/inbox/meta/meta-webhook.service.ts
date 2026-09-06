import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  META_MESSAGE_STATUS_EVENT,
  type MetaMessageStatusEvent,
} from '../../../core/events/meta-message-status.event';
import { PrismaService } from '../../../database/prisma.service';
import { ChannelCredentialsService } from '../channels/channel-credentials.service';
import type { ChannelProviderCode } from '../channels/dto/channel.dto';
import { InboxCrmLinkService } from '../crm/inbox-crm-link.service';
import { InboxRealtimeService } from '../inbox-realtime.service';

interface IncomingMessage {
  channel: ChannelProviderCode;
  accountId: string;
  participantId: string;
  providerMessageId: string;
  senderName: string;
  body: string;
  sentAt: Date;
}

interface IncomingStatus {
  channel: ChannelProviderCode;
  id?: string;
  state: string;
  participantId?: string;
  watermark?: Date;
  errorCode?: string;
  errorMessage?: string;
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
          const body =
            string(record(message.text).body) ||
            string(record(message.button).text) ||
            string(record(record(message.interactive).button_reply).title) ||
            string(record(record(message.interactive).list_reply).title) ||
            `[${string(message.type) || 'message'}]`;
          const providerMessageId = string(message.id);
          const participantId = string(message.from);
          if (!accountId || !providerMessageId || !participantId) continue;
          result.push({
            channel: 'whatsapp',
            accountId,
            participantId,
            providerMessageId,
            senderName: string(record(contact.profile).name) || participantId,
            body,
            sentAt: timestamp(message.timestamp),
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
        const attachments = array(message.attachments);
        const body =
          string(message.text) ||
          (attachments.length
            ? `[${string(record(attachments[0]).type) || 'attachment'}]`
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
        where: { providerMessageId: status.id },
        data: { delivery },
      });
      // Published for whoever owns the message; a receipt for a message this
      // inbox never sent — a campaign send, say — matches nothing above.
      this.events.emit(META_MESSAGE_STATUS_EVENT, {
        providerMessageId: status.id,
        state: status.state as MetaMessageStatusEvent['state'],
        occurredAt: new Date().toISOString(),
        errorCode: status.errorCode,
        errorMessage: status.errorMessage,
      } satisfies MetaMessageStatusEvent);
    }
    if (delivery === 'READ' && status.participantId && status.watermark)
      await this.db.inboxMessage.updateMany({
        where: {
          direction: 'OUTGOING',
          sentAt: { lte: status.watermark },
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
    if (
      await this.db.inboxMessage.findUnique({
        where: { providerMessageId: input.providerMessageId },
        select: { id: true },
      })
    )
      return;
    const normalizedPhone = this.threadIdentity(input);
    const now = input.sentAt;
    const customer = await this.db.inboxCustomer.upsert({
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
    const message = {
      direction: 'INCOMING' as const,
      senderName: input.senderName,
      body: input.body,
      sentAt: now,
      delivery: 'RECEIVED' as const,
      providerMessageId: input.providerMessageId,
    };
    await this.db.inboxConversation.upsert({
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
    await this.channels.markInbound(route.connectionId);
    const platform = await this.db.inboxPlatform.findUnique({
      where: { id: route.platformId },
      select: { label: true },
    });
    await this.crm.link({
      organizationId: route.organizationId,
      customerId: customer.id,
      identity: normalizedPhone,
      name: input.senderName,
      phone: input.participantId,
      platformCode: input.channel,
      platformLabel: platform?.label,
      occurredAt: now,
    });
  }
}

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
