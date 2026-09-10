import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../../prisma/generated/client';
import type { InboxDeliveryPort } from '../../../src/modules/inbox/delivery/inbox-delivery.port';
import { InboxPolicy } from '../../../src/modules/inbox/inbox.policy';
import { InboxRepository } from '../../../src/modules/inbox/inbox.repository';
import { InboxService } from '../../../src/modules/inbox/inbox.service';
import { InboxRealtimeService } from '../../../src/modules/inbox/inbox-realtime.service';
import type { InboxCrmLinkService } from '../../../src/modules/inbox/crm/inbox-crm-link.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';
import type { StorageService } from '../../../src/storage/storage.service.interface';

/**
 * The human-takeover safety net. These are the tests the whole AI feature rests
 * on: the AI must never speak after a human has entered the conversation, and
 * a retried job must never double-send. Everything here runs against a real
 * PostgreSQL with real transactions — the races being tested do not exist
 * against a mock.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const sent: string[] = [];
const delivery: InboxDeliveryPort = {
  enqueue: jest.fn((request) => {
    sent.push(request.messageId);
    return Promise.resolve({
      state: 'sent' as const,
      providerReference: `provider:${request.messageId}`,
    });
  }),
  markRead: jest.fn(() => Promise.resolve()),
};
const policy = new InboxPolicy();
const repository = new InboxRepository(prisma as never, policy);
const service = new InboxService(
  repository,
  policy,
  delivery,
  {} as unknown as StorageService,
  { link: jest.fn(), summary: jest.fn() } as unknown as InboxCrmLinkService,
  new InboxRealtimeService(),
);

const AGENT_DISPLAY_NAME = 'المساعد الذكي';
let organizationId = '';
let platformId = '';
let agentId = '';
let serviceAccountId = '';
let human: CallerContext = null as never;
const createdConversations: string[] = [];

const caller = (accountId: string, displayName: string): CallerContext => ({
  accountId,
  displayName,
  email: `${accountId}@example.com`,
  sessionId: randomUUID(),
  roles: [],
  permissionKeys: [
    'inbox.view.all',
    'inbox.reply',
    'inbox.change.status',
    'inbox.archive',
  ],
  organizationWide: true,
  authenticatedAt: new Date().toISOString(),
});

/** A conversation with AI live on it, at a known fencing position. */
const conversationWithAi = async (turnSeq = 0) => {
  const customer = await prisma.inboxCustomer.create({
    data: {
      organizationId,
      name: 'عميل اختبار',
      normalizedName: 'عميل اختبار',
      phone: `+2010${Date.now() % 100000000}`,
      normalizedPhone: randomUUID().replace(/\D/g, '').slice(0, 12) || '201',
      firstContactAt: new Date(),
      lastActivityAt: new Date(),
    },
  });
  const conversation = await prisma.inboxConversation.create({
    data: {
      organizationId,
      customerId: customer.id,
      platformId,
      providerThreadId: randomUUID(),
      lastMessage: 'مرحبا',
      lastActivityAt: new Date(),
      unreadCount: 2,
    },
  });
  createdConversations.push(conversation.id);
  await prisma.conversationAiState.create({
    data: { conversationId: conversation.id, organizationId, agentId, turnSeq },
  });
  return conversation.id;
};

const aiTurn = async (conversationId: string, turnSeqAtStart: number) => {
  const turn = await prisma.aiTurn.create({
    data: {
      organizationId,
      conversationId,
      agentId,
      turnSeqAtStart,
      status: 'RUNNING',
    },
  });
  return turn.id;
};

const reply = (
  conversationId: string,
  aiTurnId: string,
  expectedTurnSeq: number,
) =>
  service.sendAiReply({
    conversationId,
    agentId,
    serviceAccountId,
    agentDisplayName: AGENT_DISPLAY_NAME,
    aiTurnId,
    body: 'رد المساعد الذكي على استفسارك.',
    expectedTurnSeq,
  });

beforeAll(async () => {
  organizationId = (await prisma.organization.findFirstOrThrow()).id;
  platformId = (
    await prisma.inboxPlatform.findFirstOrThrow({ where: { organizationId } })
  ).id;
  const agent = await prisma.aiAgent.findFirstOrThrow({
    where: { organizationId },
  });
  agentId = agent.id;
  serviceAccountId = agent.serviceAccountId;
  const account = await prisma.account.findFirstOrThrow({
    where: { status: 'ACTIVE', id: { not: serviceAccountId } },
  });
  human = caller(account.id, account.displayName);
});

afterAll(async () => {
  for (const id of createdConversations) {
    const conversation = await prisma.inboxConversation.findUnique({
      where: { id },
      select: { customerId: true },
    });
    await prisma.inboxConversation
      .delete({ where: { id } })
      .catch(() => undefined);
    if (conversation)
      await prisma.inboxCustomer
        .delete({ where: { id: conversation.customerId } })
        .catch(() => undefined);
  }
  await prisma.$disconnect();
});

beforeEach(() => {
  sent.length = 0;
  jest.clearAllMocks();
});

describe('AI reply under human takeover', () => {
  it('sends when the conversation is untouched, and marks the message as AI authored', async () => {
    const conversationId = await conversationWithAi(0);
    const turnId = await aiTurn(conversationId, 0);
    await expect(reply(conversationId, turnId, 0)).resolves.toMatchObject({
      status: 'sent',
    });
    const message = await prisma.inboxMessage.findFirstOrThrow({
      where: { conversationId, direction: 'OUTGOING' },
    });
    expect(message.authorType).toBe('AI_AGENT');
    expect(message.aiTurnId).toBe(turnId);
    expect(message.delivery).toBe('SENT');
    expect(sent).toEqual([message.id]);
  });

  it('writes NO message at all when a human replied before the commit', async () => {
    const conversationId = await conversationWithAi(0);
    const turnId = await aiTurn(conversationId, 0);
    // The human reply moves turnSeq, exactly as it would mid-generation.
    await service.sendReply(human, conversationId, {
      body: 'أهلاً، سأتابع معك بنفسي.',
      retryToken: randomUUID(),
      attachments: [],
    });
    // The human's own send is expected; only the AI attempt is under test.
    sent.length = 0;
    await expect(reply(conversationId, turnId, 0)).resolves.toEqual({
      status: 'suppressed',
    });
    const ai = await prisma.inboxMessage.findMany({
      where: { conversationId, authorType: 'AI_AGENT' },
    });
    expect(ai).toHaveLength(0);
    expect(sent).toEqual([]);
  });

  it('pauses the AI in the same transaction as the human reply', async () => {
    const conversationId = await conversationWithAi(0);
    await service.sendReply(human, conversationId, {
      body: 'تم الاستلام.',
      retryToken: randomUUID(),
      attachments: [],
    });
    const state = await prisma.conversationAiState.findUniqueOrThrow({
      where: { conversationId },
    });
    expect(state.mode).toBe('PAUSED');
    expect(state.pausedReason).toBe('HUMAN_REPLY');
    expect(state.pausedByAccountId).toBe(human.accountId);
    expect(state.turnSeq).toBe(1);
    // The seeded agent has resumeAfterMinutes null: never auto-resume.
    expect(state.resumeAt).toBeNull();
  });

  it('suppresses without sending when the takeover lands between commit and dispatch', async () => {
    const conversationId = await conversationWithAi(0);
    const turnId = await aiTurn(conversationId, 0);
    // Claiming dispatch first is exactly what a competing attempt does, so the
    // real turn finds dispatchStartedAt already set and must not send.
    await prisma.aiTurn.update({
      where: { id: turnId },
      data: { dispatchStartedAt: new Date() },
    });
    await expect(reply(conversationId, turnId, 0)).resolves.toMatchObject({
      status: 'suppressed',
    });
    const message = await prisma.inboxMessage.findFirstOrThrow({
      where: { conversationId, authorType: 'AI_AGENT' },
    });
    expect(message.delivery).toBe('SUPPRESSED');
    expect(sent).toEqual([]);
    const event = await prisma.inboxSystemEvent.findFirst({
      where: { conversationId, type: 'ai.reply.suppressed' },
    });
    expect(event).not.toBeNull();
  });

  it('does not clobber unreadCount when the AI replies', async () => {
    const conversationId = await conversationWithAi(0);
    const turnId = await aiTurn(conversationId, 0);
    await reply(conversationId, turnId, 0);
    const after = await prisma.inboxConversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    // A human replying implies a human read the thread; an AI reply does not.
    expect(after.unreadCount).toBe(2);
  });

  it('clears unreadCount when a human replies', async () => {
    const conversationId = await conversationWithAi(0);
    await service.sendReply(human, conversationId, {
      body: 'شكراً لتواصلك.',
      retryToken: randomUUID(),
      attachments: [],
    });
    const after = await prisma.inboxConversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    expect(after.unreadCount).toBe(0);
  });

  it('is idempotent across a retry: one message, one provider send', async () => {
    const conversationId = await conversationWithAi(0);
    const turnId = await aiTurn(conversationId, 0);
    const first = await reply(conversationId, turnId, 0);
    expect(first.status).toBe('sent');
    // A BullMQ retry replays the identical payload, so the retryToken is stable.
    const second = await reply(conversationId, turnId, 0);
    const messages = await prisma.inboxMessage.findMany({
      where: { conversationId, authorType: 'AI_AGENT' },
    });
    expect(messages).toHaveLength(1);
    // The retry must not re-decide whether to speak, and must not send twice.
    expect(second.status).toBe('suppressed');
    expect(sent).toEqual([first.messageId]);
  });

  it('only one of two concurrent turns at the same fencing position wins', async () => {
    const conversationId = await conversationWithAi(0);
    const [a, b] = await Promise.all([
      aiTurn(conversationId, 0),
      aiTurn(conversationId, 0),
    ]);
    const results = await Promise.all([
      reply(conversationId, a, 0),
      reply(conversationId, b, 0),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual(['sent', 'suppressed']);
    const messages = await prisma.inboxMessage.findMany({
      where: { conversationId, authorType: 'AI_AGENT' },
    });
    expect(messages).toHaveLength(1);
    expect(sent).toHaveLength(1);
  });

  it('refuses to speak on an archived conversation', async () => {
    const conversationId = await conversationWithAi(0);
    const turnId = await aiTurn(conversationId, 0);
    await prisma.inboxConversation.update({
      where: { id: conversationId },
      data: { status: 'ARCHIVED' },
    });
    await expect(reply(conversationId, turnId, 0)).resolves.toEqual({
      status: 'suppressed',
    });
    expect(sent).toEqual([]);
  });

  it('refuses to speak while manually paused', async () => {
    const conversationId = await conversationWithAi(0);
    const turnId = await aiTurn(conversationId, 0);
    await prisma.conversationAiState.update({
      where: { conversationId },
      data: { mode: 'PAUSED', pausedReason: 'MANUAL' },
    });
    await expect(reply(conversationId, turnId, 0)).resolves.toEqual({
      status: 'suppressed',
    });
    expect(sent).toEqual([]);
  });
});
