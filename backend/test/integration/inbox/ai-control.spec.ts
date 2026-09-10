import '../../../test/load-env';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../../prisma/generated/client';
import { AiResumeSweeper } from '../../../src/modules/ai/runtime/ai-resume.sweeper';
import type { InboxDeliveryPort } from '../../../src/modules/inbox/delivery/inbox-delivery.port';
import { InboxPolicy } from '../../../src/modules/inbox/inbox.policy';
import { InboxRepository } from '../../../src/modules/inbox/inbox.repository';
import { InboxRealtimeService } from '../../../src/modules/inbox/inbox-realtime.service';
import { InboxService } from '../../../src/modules/inbox/inbox.service';
import type { InboxCrmLinkService } from '../../../src/modules/inbox/crm/inbox-crm-link.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';
import type { StorageService } from '../../../src/storage/storage.service.interface';

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
const realtime = new InboxRealtimeService();
const service = new InboxService(
  repository,
  policy,
  delivery,
  {} as unknown as StorageService,
  { link: jest.fn(), summary: jest.fn() } as unknown as InboxCrmLinkService,
  realtime,
);
const sweeper = new AiResumeSweeper(
  prisma as never,
  new ConfigService({
    ai: { resumeSweepEnabled: true, resumeSweepMs: 30000 },
  }),
  new InboxRealtimeService(),
);

let organizationId = '';
let platformId = '';
let agentId = '';
let serviceAccountId = '';
let human: CallerContext = null as never;
let sequence = 0;
const createdConversations: string[] = [];

const caller = (accountId: string, displayName: string): CallerContext => ({
  accountId,
  displayName,
  email: `${accountId}@example.com`,
  sessionId: randomUUID(),
  roles: [],
  permissionKeys: ['inbox.view.all', 'inbox.ai.control'],
  organizationWide: true,
  authenticatedAt: new Date().toISOString(),
});

const conversationWithAi = async (input?: {
  mode?: 'AUTO' | 'PAUSED';
  pausedReason?: 'MANUAL' | 'ESCALATED';
  resumeAt?: Date | null;
  turnSeq?: number;
}) => {
  sequence += 1;
  const customer = await prisma.inboxCustomer.create({
    data: {
      organizationId,
      name: 'عميل تحكم المساعد',
      normalizedName: 'عميل تحكم المساعد',
      phone: `+2010999${Date.now()}${sequence}`,
      normalizedPhone: `2010999${Date.now()}${sequence}`,
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
    },
  });
  createdConversations.push(conversation.id);
  await prisma.conversationAiState.create({
    data: {
      conversationId: conversation.id,
      organizationId,
      agentId,
      mode: input?.mode ?? 'AUTO',
      pausedReason: input?.pausedReason,
      pausedAt: input?.mode === 'PAUSED' ? new Date() : null,
      resumeAt: input?.resumeAt,
      turnSeq: input?.turnSeq ?? 0,
    },
  });
  return conversation.id;
};

const staleReply = async (conversationId: string, expectedTurnSeq: number) => {
  const turn = await prisma.aiTurn.create({
    data: {
      organizationId,
      conversationId,
      agentId,
      turnSeqAtStart: expectedTurnSeq,
      status: 'RUNNING',
    },
  });
  return service.sendAiReply({
    conversationId,
    agentId,
    serviceAccountId,
    agentDisplayName: 'المساعد الذكي',
    aiTurnId: turn.id,
    body: 'رد آلي قديم',
    expectedTurnSeq,
  });
};

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
    await prisma.aiTurn.deleteMany({ where: { conversationId: id } });
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

describe('AI conversation controls', () => {
  it('resumes only due manual pauses and records the agent service account', async () => {
    const due = await conversationWithAi({
      mode: 'PAUSED',
      pausedReason: 'MANUAL',
      resumeAt: new Date(Date.now() - 60_000),
      turnSeq: 2,
    });
    const future = await conversationWithAi({
      mode: 'PAUSED',
      pausedReason: 'MANUAL',
      resumeAt: new Date(Date.now() + 60_000),
    });
    const escalated = await conversationWithAi({
      mode: 'PAUSED',
      pausedReason: 'ESCALATED',
      resumeAt: new Date(Date.now() - 60_000),
    });

    await sweeper.tick();

    const states = await prisma.conversationAiState.findMany({
      where: { conversationId: { in: [due, future, escalated] } },
    });
    expect(states.find((state) => state.conversationId === due)).toMatchObject({
      mode: 'AUTO',
      pausedReason: null,
      resumeAt: null,
      turnSeq: 3,
      version: 2,
    });
    expect(states.find((state) => state.conversationId === future)?.mode).toBe(
      'PAUSED',
    );
    expect(
      states.find((state) => state.conversationId === escalated)?.mode,
    ).toBe('PAUSED');
    const event = await prisma.inboxSystemEvent.findFirstOrThrow({
      where: { conversationId: due, type: 'ai.resumed' },
    });
    expect(event.actorId).toBe(serviceAccountId);
    expect(event.label).toBe('استؤنف المساعد الذكي');
  });

  it('manually pauses with versioning and refuses an AI reply', async () => {
    const conversationId = await conversationWithAi();

    await service.setAiMode(human, conversationId, {
      action: 'pause',
      expectedVersion: 1,
    });

    const state = await prisma.conversationAiState.findUniqueOrThrow({
      where: { conversationId },
    });
    expect(state).toMatchObject({
      mode: 'PAUSED',
      pausedReason: 'MANUAL',
      pausedByAccountId: human.accountId,
      resumeAt: null,
      version: 2,
    });
    expect(state.pausedAt).not.toBeNull();
    await expect(staleReply(conversationId, 0)).resolves.toEqual({
      status: 'suppressed',
    });
    expect(sent).toEqual([]);
    expect(await prisma.inboxMessage.count({ where: { conversationId } })).toBe(
      0,
    );
  });

  it('increments the fence on resume so a pre-resume turn stays suppressed', async () => {
    const conversationId = await conversationWithAi();
    await service.setAiMode(human, conversationId, {
      action: 'pause',
      expectedVersion: 1,
    });

    await service.setAiMode(human, conversationId, {
      action: 'resume',
      expectedVersion: 2,
    });

    const state = await prisma.conversationAiState.findUniqueOrThrow({
      where: { conversationId },
    });
    expect(state).toMatchObject({ mode: 'AUTO', turnSeq: 1, version: 3 });
    await expect(staleReply(conversationId, 0)).resolves.toEqual({
      status: 'suppressed',
    });
    expect(sent).toEqual([]);
    expect(await prisma.inboxMessage.count({ where: { conversationId } })).toBe(
      0,
    );
  });
});
