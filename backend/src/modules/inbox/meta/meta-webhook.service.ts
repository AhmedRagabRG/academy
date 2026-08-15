import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../../database/prisma.service';
import { InboxRealtimeService } from '../inbox-realtime.service';

interface IncomingMessage {
  channel: 'whatsapp' | 'messenger';
  accountId: string;
  participantId: string;
  providerMessageId: string;
  senderName: string;
  body: string;
  sentAt: Date;
}

@Injectable()
export class MetaWebhookService {
  constructor(
    private readonly config: ConfigService,
    private readonly db: PrismaService,
    private readonly realtime: InboxRealtimeService,
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

  private messages(payload: unknown): IncomingMessage[] {
    if (!payload || typeof payload !== 'object') return [];
    const root = payload as Record<string, unknown>;
    return root.object === 'whatsapp_business_account'
      ? this.whatsappMessages(root)
      : root.object === 'page'
        ? this.messengerMessages(root)
        : [];
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

  private messengerMessages(root: Record<string, unknown>): IncomingMessage[] {
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
        result.push({
          channel: 'messenger',
          accountId,
          participantId,
          providerMessageId,
          senderName: `Messenger ${participantId.slice(-6)}`,
          body: string(message.text) || '[attachment]',
          sentAt: timestamp(event.timestamp),
        });
      }
    }
    return result;
  }

  private statuses(payload: unknown): Array<{
    id?: string;
    state: string;
    participantId?: string;
    watermark?: Date;
  }> {
    if (!payload || typeof payload !== 'object') return [];
    const root = payload as Record<string, unknown>;
    if (root.object === 'page') return this.messengerStatuses(root);
    if (root.object !== 'whatsapp_business_account') return [];
    const result: Array<{ id: string; state: string }> = [];
    for (const entry of array(root.entry))
      for (const change of array(record(entry).changes))
        for (const source of array(record(record(change).value).statuses)) {
          const status = record(source);
          const id = string(status.id);
          const state = string(status.status);
          if (id && state) result.push({ id, state });
        }
    return result;
  }

  private messengerStatuses(root: Record<string, unknown>) {
    const result: Array<{
      id?: string;
      state: string;
      participantId?: string;
      watermark?: Date;
    }> = [];
    for (const entry of array(root.entry))
      for (const source of array(record(entry).messaging)) {
        const event = record(source);
        for (const id of array(record(event.delivery).mids))
          if (typeof id === 'string') result.push({ id, state: 'delivered' });
        const watermark = record(event.read).watermark;
        const participantId = string(record(event.sender).id);
        if (watermark && participantId)
          result.push({
            state: 'read',
            participantId,
            watermark: timestamp(watermark),
          });
      }
    return result;
  }

  private async applyStatus(status: {
    id?: string;
    state: string;
    participantId?: string;
    watermark?: Date;
  }) {
    const delivery = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    }[status.state] as 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | undefined;
    if (delivery && status.id)
      await this.db.inboxMessage.updateMany({
        where: { providerMessageId: status.id },
        data: { delivery },
      });
    if (delivery === 'READ' && status.participantId && status.watermark)
      await this.db.inboxMessage.updateMany({
        where: {
          direction: 'OUTGOING',
          sentAt: { lte: status.watermark },
          conversation: {
            providerThreadId: status.participantId,
            platform: { code: 'messenger' },
          },
        },
        data: { delivery: 'READ' },
      });
  }

  private async persist(input: IncomingMessage): Promise<void> {
    const configuredAccount =
      input.channel === 'whatsapp'
        ? this.config.get<string>('meta.whatsappPhoneNumberId')
        : this.config.get<string>('meta.messengerPageId');
    if (configuredAccount && configuredAccount !== input.accountId) return;
    if (
      await this.db.inboxMessage.findUnique({
        where: { providerMessageId: input.providerMessageId },
        select: { id: true },
      })
    )
      return;
    const platform = await this.db.inboxPlatform.findFirst({
      where: { code: input.channel, active: true },
      orderBy: { id: 'asc' },
    });
    if (!platform) return;
    const branch = await this.db.branch.findFirstOrThrow({
      where: { organizationId: platform.organizationId, status: 'ACTIVE' },
      orderBy: { code: 'asc' },
    });
    const normalizedPhone =
      input.channel === 'whatsapp'
        ? input.participantId.replace(/\D/g, '')
        : `messenger:${input.participantId}`;
    const now = input.sentAt;
    const customer = await this.db.inboxCustomer.upsert({
      where: {
        organizationId_normalizedPhone: {
          organizationId: platform.organizationId,
          normalizedPhone,
        },
      },
      update: {
        name: input.senderName,
        normalizedName: input.senderName.toLowerCase(),
        lastActivityAt: now,
      },
      create: {
        organizationId: platform.organizationId,
        branchId: branch.id,
        name: input.senderName,
        normalizedName: input.senderName.toLowerCase(),
        phone: input.participantId,
        normalizedPhone,
        firstContactAt: now,
        lastActivityAt: now,
      },
    });
    await this.db.inboxConversation.upsert({
      where: {
        platformId_providerThreadId: {
          platformId: platform.id,
          providerThreadId: input.participantId,
        },
      },
      update: {
        status: 'OPEN',
        lastMessage: input.body,
        lastActivityAt: now,
        unreadCount: { increment: 1 },
        version: { increment: 1 },
        messages: {
          create: {
            direction: 'INCOMING',
            senderName: input.senderName,
            body: input.body,
            sentAt: now,
            delivery: 'RECEIVED',
            providerMessageId: input.providerMessageId,
          },
        },
      },
      create: {
        organizationId: platform.organizationId,
        customerId: customer.id,
        platformId: platform.id,
        providerThreadId: input.participantId,
        status: 'OPEN',
        unreadCount: 1,
        lastMessage: input.body,
        lastActivityAt: now,
        messages: {
          create: {
            direction: 'INCOMING',
            senderName: input.senderName,
            body: input.body,
            sentAt: now,
            delivery: 'RECEIVED',
            providerMessageId: input.providerMessageId,
          },
        },
      },
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
