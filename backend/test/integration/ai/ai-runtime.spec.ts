import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import type { Job } from 'bullmq';
import { PrismaClient } from '../../../prisma/generated/client';
import { InboxPolicy } from '../../../src/modules/inbox/inbox.policy';
import { InboxRepository } from '../../../src/modules/inbox/inbox.repository';
import { InboxService } from '../../../src/modules/inbox/inbox.service';
import { InboxRealtimeService } from '../../../src/modules/inbox/inbox-realtime.service';
import type { InboxDeliveryPort } from '../../../src/modules/inbox/delivery/inbox-delivery.port';
import type { InboxCrmLinkService } from '../../../src/modules/inbox/crm/inbox-crm-link.service';
import type { StorageService } from '../../../src/storage/storage.service.interface';
import { KbIngestProcessor } from '../../../src/modules/ai/knowledge/ingestion/kb-ingest.processor';
import { KnowledgeRepository } from '../../../src/modules/ai/knowledge/knowledge.repository';
import type { KbIngestJob } from '../../../src/modules/ai/knowledge/knowledge.service';
import type {
  ChatResult,
  OpenAiClient,
} from '../../../src/modules/ai/llm/openai.client';
import { KbSearchTool } from '../../../src/modules/ai/tools/kb-search.tool';
import { CrmReadContactTool } from '../../../src/modules/ai/tools/crm-read-contact.tool';
import { AiOrchestratorService } from '../../../src/modules/ai/runtime/ai-orchestrator.service';
import { AiEligibilityService } from '../../../src/modules/ai/runtime/ai-eligibility.service';
import { AiContextService } from '../../../src/modules/ai/runtime/ai-context.service';
import {
  AiTurnProcessor,
  type AiTurnJob,
} from '../../../src/modules/ai/runtime/ai-turn.processor';
import { AiTurnEnqueueService } from '../../../src/modules/ai/runtime/ai-turn-enqueue.service';
import type { Queue } from 'bullmq';

/**
 * The agent runtime end to end against real PostgreSQL: eligibility, context,
 * the tool loop with real pgvector retrieval, fencing, suppression, the error
 * budget and the fallback handoff. Only the OpenAI client, the delivery port
 * and the BullMQ queue are stubbed — the queue stub records job ids so the
 * debounce/re-enqueue design is observable without Redis.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const vector = (first: number, second: number): number[] =>
  Array.from({ length: 1536 }, (_, index) =>
    index === 0 ? first : index === 1 ? second : 0,
  );
const vectorFor = (text: string): number[] =>
  text.includes('distant') || text.includes('new-version')
    ? vector(0, 1)
    : vector(1, 0);

let chatScript: Array<ChatResult | Error | (() => Promise<void>)> = [];
const openAi = {
  chat: jest.fn(async () => {
    for (;;) {
      const next = chatScript.shift();
      if (next instanceof Error) throw next;
      // A function entry runs as a mid-generation side effect — e.g. a second
      // customer message landing while the model is thinking.
      if (typeof next === 'function') {
        await next();
        continue;
      }
      return next as ChatResult;
    }
  }),
  embed: jest.fn((input: { texts: string[] }) =>
    Promise.resolve(input.texts.map(vectorFor)),
  ),
} as unknown as OpenAiClient;

const sent: Array<{ messageId: string; platformCode: string }> = [];
const delivery: InboxDeliveryPort = {
  enqueue: jest.fn((request) => {
    sent.push({
      messageId: request.messageId,
      platformCode: request.platformCode,
    });
    return Promise.resolve({
      state: 'sent' as const,
      providerReference: `provider:${request.messageId}`,
    });
  }),
  markRead: jest.fn(() => Promise.resolve()),
};
const followUps: Array<{ conversationId: string; fencedTurnId: string }> = [];
// The processor gets a recorder so follow-up assertions are deterministic; the
// real AiTurnEnqueueService is exercised against a stubbed queue further down.
const followUpRecorder = {
  enqueueFollowUp: jest.fn((conversationId: string, fencedTurnId: string) => {
    followUps.push({ conversationId, fencedTurnId });
  }),
};

const knowledge = new KnowledgeRepository(prisma as never);
const ingest = new KbIngestProcessor(knowledge, {} as StorageService, openAi);
const policy = new InboxPolicy();
const inbox = new InboxService(
  new InboxRepository(prisma as never, policy),
  policy,
  delivery,
  {} as unknown as StorageService,
  { link: jest.fn(), summary: jest.fn() } as unknown as InboxCrmLinkService,
  new InboxRealtimeService(),
);
const orchestrator = new AiOrchestratorService(
  openAi,
  prisma as never,
  new KbSearchTool(knowledge, openAi),
  new CrmReadContactTool(prisma as never),
);
const processor = new AiTurnProcessor(
  prisma as never,
  new AiEligibilityService(prisma as never),
  new AiContextService(prisma as never),
  orchestrator,
  inbox,
  followUpRecorder as never,
);

let organizationId = '';
let agentId = '';
let serviceAccountId = '';
const platformIds: Record<string, string> = {};
const conversationIds: string[] = [];
const baseIds: string[] = [];

const createBase = async (name: string) => {
  const row = await prisma.knowledgeBase.create({
    data: { organizationId, name: `${name}-${randomUUID()}` },
  });
  baseIds.push(row.id);
  return row.id;
};

const createTextSource = async (input: {
  knowledgeBaseId: string;
  title: string;
  rawText: string;
  visibility?: 'CUSTOMER_FACING' | 'INTERNAL';
}) => {
  const source = await prisma.knowledgeSource.create({
    data: {
      organizationId,
      knowledgeBaseId: input.knowledgeBaseId,
      kind: 'TEXT',
      title: input.title,
      rawText: input.rawText,
      mimeType: 'text/plain',
      visibility: input.visibility ?? 'CUSTOMER_FACING',
    },
  });
  await ingest.process({ data: { sourceId: source.id } } as Job<KbIngestJob>);
};

const createConversation = async (platformCode: string) => {
  const customer = await prisma.inboxCustomer.create({
    data: {
      organizationId,
      name: 'عميل اختبار',
      normalizedName: 'عميل اختبار',
      phone: `+2010${Date.now()}${randomUUID().slice(0, 2)}`,
      normalizedPhone: randomUUID().replace(/\D/g, '').slice(0, 12) || '2010',
      firstContactAt: new Date(),
      lastActivityAt: new Date(),
    },
  });
  const conversation = await prisma.inboxConversation.create({
    data: {
      organizationId,
      customerId: customer.id,
      platformId: platformIds[platformCode] ?? platformIds.whatsapp,
      providerThreadId: randomUUID(),
      lastMessage: 'مرحبا',
      lastActivityAt: new Date(),
      unreadCount: 1,
    },
  });
  conversationIds.push(conversation.id);
  await prisma.conversationAiState.create({
    data: {
      conversationId: conversation.id,
      organizationId,
      agentId,
      turnSeq: 0,
    },
  });
  return conversation.id;
};

/** An inbound customer message, mirroring the webhook's turnSeq increment. */
const inbound = async (conversationId: string, body: string) => {
  await prisma.inboxMessage.create({
    data: {
      conversationId,
      direction: 'INCOMING',
      authorType: 'CUSTOMER',
      senderName: 'عميل اختبار',
      body,
      delivery: 'RECEIVED',
      sentAt: new Date(),
    },
  });
  await prisma.conversationAiState.update({
    where: { conversationId },
    data: { turnSeq: { increment: 1 } },
  });
};

const mintTurn = async (conversationId: string) => {
  const state = await prisma.conversationAiState.findUniqueOrThrow({
    where: { conversationId },
  });
  return prisma.aiTurn.create({
    data: {
      organizationId,
      conversationId,
      agentId,
      turnSeqAtStart: state.turnSeq,
      status: 'QUEUED',
    },
  });
};

const processTurn = (
  conversationId: string,
  aiTurnId: string,
  attemptsMade = 0,
) =>
  processor.process({
    data: { conversationId, aiTurnId },
    attemptsMade,
    opts: { attempts: 3 },
  } as unknown as Job<AiTurnJob>);

const scripted = (
  ...responses: Array<ChatResult | Error | (() => Promise<void>)>
) => {
  chatScript = [...responses];
};

const chatText = (content: string): ChatResult => ({
  content,
  toolCalls: [],
  promptTokens: 20,
  completionTokens: 10,
});
const chatSearch = (query: string): ChatResult => ({
  content: null,
  toolCalls: [
    {
      id: randomUUID(),
      name: 'kb_search',
      arguments: JSON.stringify({ query }),
    },
  ],
  promptTokens: 20,
  completionTokens: 5,
});

beforeAll(async () => {
  organizationId = (await prisma.organization.findFirstOrThrow()).id;
  for (const code of ['whatsapp', 'messenger', 'instagram']) {
    const existing = await prisma.inboxPlatform.findFirst({
      where: { organizationId, code },
    });
    platformIds[code] =
      existing?.id ??
      (
        await prisma.inboxPlatform.create({
          data: { organizationId, code, label: code, icon: 'message' },
        })
      ).id;
  }
  serviceAccountId = (
    await prisma.account.findFirstOrThrow({ where: { status: 'ACTIVE' } })
  ).id;
  const agent = await prisma.aiAgent.create({
    data: {
      organizationId,
      name: `وكيل اختبار التشغيل-${randomUUID()}`,
      enabled: true,
      systemInstructions: 'أجب بدقة من قاعدة المعرفة فقط.',
      tone: 'ودود',
      responseLanguage: 'ar',
      model: 'gpt-4o',
      temperature: 0.3,
      maxResponseChars: 1200,
      enabledPlatformCodes: Object.keys(platformIds),
      outsideHoursBehaviour: 'silent',
      fallbackMessage: 'عذرًا، لا أملك الإجابة. سأحوّلك إلى أحد موظفينا.',
      handoffMessage: 'سيكمل موظف مساعدتك.',
      serviceAccountId,
    },
  });
  agentId = agent.id;
});

afterAll(async () => {
  for (const conversationId of conversationIds) {
    const turns = await prisma.aiTurn.findMany({
      where: { conversationId },
      select: { id: true },
    });
    for (const turn of turns)
      await prisma.aiToolExecution
        .deleteMany({ where: { aiTurnId: turn.id } })
        .catch(() => undefined);
    await prisma.aiTurn
      .deleteMany({ where: { conversationId } })
      .catch(() => undefined);
    const conversation = await prisma.inboxConversation
      .findUnique({
        where: { id: conversationId },
        select: { customerId: true },
      })
      .catch(() => null);
    await prisma.inboxConversation
      .delete({ where: { id: conversationId } })
      .catch(() => undefined);
    if (conversation)
      await prisma.inboxCustomer
        .delete({ where: { id: conversation.customerId } })
        .catch(() => undefined);
  }
  for (const id of baseIds)
    await prisma.knowledgeBase.delete({ where: { id } }).catch(() => undefined);
  await prisma.aiAgent
    .delete({ where: { id: agentId } })
    .catch(() => undefined);
  await prisma.$disconnect();
});

beforeEach(() => {
  sent.length = 0;
  followUps.length = 0;
  followUpRecorder.enqueueFollowUp.mockClear();
  chatScript = [];
});

describe('agent runtime', () => {
  it('answers a known question from the KB with a grounded, AI-authored reply', async () => {
    const baseId = await createBase('runtime-known');
    await createTextSource({
      knowledgeBaseId: baseId,
      title: 'الرسوم',
      rawText: 'رسوم دورة اللغة الإنجليزية 500 ريال شهريًا.',
    });
    await prisma.aiAgentKnowledgeBase.create({
      data: { organizationId, agentId, knowledgeBaseId: baseId },
    });
    const conversationId = await createConversation('whatsapp');
    await inbound(conversationId, 'كم رسوم دورة الإنجليزية؟');
    const turn = await mintTurn(conversationId);
    scripted(
      chatSearch('رسوم دورة الإنجليزية'),
      chatText('رسوم دورة اللغة الإنجليزية 500 ريال شهريًا. هل تود التسجيل؟'),
    );

    await processTurn(conversationId, turn.id);

    const finished = await prisma.aiTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    expect(finished.status).toBe('REPLIED');
    expect(finished.retrievedChunkIds).toHaveLength(1);
    const message = await prisma.inboxMessage.findFirstOrThrow({
      where: { conversationId, authorType: 'AI_AGENT' },
    });
    expect(message.body).toContain('500 ريال');
    expect(message.delivery).toBe('SENT');
    expect(message.aiTurnId).toBe(turn.id);
    expect(sent).toEqual([{ messageId: message.id, platformCode: 'whatsapp' }]);
    const executions = await prisma.aiToolExecution.findMany({
      where: { aiTurnId: turn.id },
    });
    expect(executions).toEqual([
      expect.objectContaining({ toolName: 'kb_search', outcome: 'SUCCESS' }),
    ]);
  }, 30_000);

  it('sends the fallback and hands off when retrieval is empty, without inventing facts', async () => {
    const baseId = await createBase('runtime-unknown');
    await createTextSource({
      knowledgeBaseId: baseId,
      title: 'غير ذي صلة',
      rawText: 'closest semantic material.',
    });
    await prisma.aiAgentKnowledgeBase.create({
      data: { organizationId, agentId, knowledgeBaseId: baseId },
    });
    const conversationId = await createConversation('whatsapp');
    await inbound(conversationId, 'كم رسوم دورة الطبخ؟');
    const turn = await mintTurn(conversationId);
    // The model searches ('distant' embeds orthogonally → below the floor),
    // then asserts a price anyway — exactly the anti-hallucination case.
    scripted(chatSearch('distant'), chatText('رسوم دورة الطبخ 300 ريال.'));

    await processTurn(conversationId, turn.id);

    const finished = await prisma.aiTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    expect(finished.status).toBe('REPLIED');
    expect(finished.retrievedChunkIds).toEqual([]);
    const message = await prisma.inboxMessage.findFirstOrThrow({
      where: { conversationId, aiTurnId: turn.id },
    });
    expect(message.body).toBe(
      'عذرًا، لا أملك الإجابة. سأحوّلك إلى أحد موظفينا.',
    );
    const state = await prisma.conversationAiState.findUniqueOrThrow({
      where: { conversationId },
    });
    // escalateOnFallback defaults to true: the promise to fetch a human must
    // actually pause the conversation for one.
    expect(state.mode).toBe('PAUSED');
    expect(state.pausedReason).toBe('HANDOFF');
    expect(state.resumeAt).toBeNull();
    const events = await prisma.inboxSystemEvent.findMany({
      where: { conversationId, type: 'ai.handoff' },
    });
    expect(events).toHaveLength(1);
  }, 30_000);

  it('leaves the conversation in AUTO after a fallback when escalation is disabled', async () => {
    await prisma.aiAgent.update({
      where: { id: agentId },
      data: { escalateOnFallback: false },
    });
    const baseId = await createBase('runtime-no-escalate');
    await createTextSource({
      knowledgeBaseId: baseId,
      title: 'غير ذي صلة',
      rawText: 'closest semantic material.',
    });
    await prisma.aiAgentKnowledgeBase.create({
      data: { organizationId, agentId, knowledgeBaseId: baseId },
    });
    const conversationId = await createConversation('whatsapp');
    await inbound(conversationId, 'سؤال لا توجد له إجابة؟');
    const turn = await mintTurn(conversationId);
    scripted(chatSearch('distant'), chatText('الجواب 42.'));

    await processTurn(conversationId, turn.id);

    const state = await prisma.conversationAiState.findUniqueOrThrow({
      where: { conversationId },
    });
    expect(state.mode).toBe('AUTO');
    await prisma.aiAgent.update({
      where: { id: agentId },
      data: { escalateOnFallback: true },
    });
  }, 30_000);

  it('never retrieves chunks outside the bound KBs or from INTERNAL sources', async () => {
    const boundId = await createBase('runtime-bound');
    await createTextSource({
      knowledgeBaseId: boundId,
      title: 'عام',
      rawText: 'closest semantic material.',
    });
    await createTextSource({
      knowledgeBaseId: boundId,
      title: 'داخلي',
      rawText: 'closest internal material.',
      visibility: 'INTERNAL',
    });
    const unboundId = await createBase('runtime-unbound');
    await createTextSource({
      knowledgeBaseId: unboundId,
      title: 'قاعدة غير مرتبطة',
      rawText: 'closest unbound material.',
    });
    await prisma.aiAgentKnowledgeBase.create({
      data: { organizationId, agentId, knowledgeBaseId: boundId },
    });
    const conversationId = await createConversation('whatsapp');
    await inbound(conversationId, 'ما هي التفاصيل؟');
    const turn = await mintTurn(conversationId);
    scripted(
      chatSearch('closest'),
      chatText('هذه هي التفاصيل المتوفرة لدينا. هل تحتاج شيئًا آخر؟'),
    );

    await processTurn(conversationId, turn.id);

    const finished = await prisma.aiTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    const chunks = await prisma.knowledgeChunk.findMany({
      where: { id: { in: finished.retrievedChunkIds } },
      select: {
        knowledgeBaseId: true,
        source: { select: { visibility: true } },
      },
    });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    // The agent accumulates bindings across tests, so the property under test
    // is the filter itself: nothing unbound, nothing INTERNAL.
    for (const chunk of chunks) {
      expect(chunk.knowledgeBaseId).not.toBe(unboundId);
      expect(chunk.source.visibility).toBe('CUSTOMER_FACING');
    }
    const unboundChunks = await prisma.knowledgeChunk.findMany({
      where: { knowledgeBaseId: unboundId },
      select: { id: true },
    });
    expect(finished.retrievedChunkIds).not.toContain(unboundChunks[0]?.id);
  }, 30_000);

  it('orchestrates identically on all three Meta channels', async () => {
    const baseId = await createBase('runtime-channels');
    await createTextSource({
      knowledgeBaseId: baseId,
      title: 'المواعيد',
      rawText: 'مواعيد العمل من الأحد إلى الخميس 9 صباحًا حتى 5 مساءً.',
    });
    await prisma.aiAgentKnowledgeBase.create({
      data: { organizationId, agentId, knowledgeBaseId: baseId },
    });
    const bodies: string[] = [];
    for (const code of ['whatsapp', 'messenger', 'instagram']) {
      const conversationId = await createConversation(code);
      await inbound(conversationId, 'ما هي مواعيد العمل؟');
      const turn = await mintTurn(conversationId);
      scripted(
        chatSearch('مواعيد العمل'),
        chatText('مواعيد العمل 9 صباحًا حتى 5 مساءً. نراك قريبًا!'),
      );
      await processTurn(conversationId, turn.id);
      const message = await prisma.inboxMessage.findFirstOrThrow({
        where: { conversationId, aiTurnId: turn.id },
      });
      bodies.push(message.body);
      expect(sent.at(-1)?.platformCode).toBe(code);
    }
    expect(new Set(bodies).size).toBe(1);
  }, 45_000);

  it('keeps the context window bounded on a long conversation', async () => {
    const conversationId = await createConversation('whatsapp');
    for (let index = 0; index < 200; index += 1) {
      await prisma.inboxMessage.create({
        data: {
          conversationId,
          direction: index % 2 === 0 ? 'INCOMING' : 'OUTGOING',
          authorType: index % 2 === 0 ? 'CUSTOMER' : 'HUMAN_AGENT',
          senderName: 'عميل اختبار',
          body: `رسالة رقم ${index}`,
          delivery: index % 2 === 0 ? 'RECEIVED' : 'SENT',
          sentAt: new Date(Date.now() + index),
        },
      });
    }
    const context = new AiContextService(prisma as never);
    const built = await context.build(conversationId);
    expect(built.messages.length).toBeLessThanOrEqual(20);
    // 200 alternating messages: index 199 is the human's last reply.
    expect(built.messages.at(-1)).toMatchObject({ role: 'assistant' });
    expect(built.messages.at(-1)?.content).toContain('رسالة رقم 199');

    await prisma.inboxMessage.create({
      data: {
        conversationId,
        direction: 'INCOMING',
        authorType: 'CUSTOMER',
        senderName: 'عميل اختبار',
        body: 'ط'.repeat(5000),
        delivery: 'RECEIVED',
        sentAt: new Date(),
      },
    });
    const bounded = await context.build(conversationId);
    const newest = bounded.messages.at(-1);
    expect(newest?.content.length).toBeLessThanOrEqual(
      '<customer_message>\n'.length + 2000 + '\n</customer_message>'.length,
    );
  }, 30_000);

  it('re-enqueues a follow-up when a newer inbound message fences the turn out', async () => {
    const baseId = await createBase('runtime-followup');
    await createTextSource({
      knowledgeBaseId: baseId,
      title: 'عام',
      rawText: 'closest semantic material.',
    });
    await prisma.aiAgentKnowledgeBase.create({
      data: { organizationId, agentId, knowledgeBaseId: baseId },
    });
    const conversationId = await createConversation('whatsapp');
    await inbound(conversationId, 'الرسالة الأولى');
    const turn = await mintTurn(conversationId);
    // A second customer message lands mid-generation: the webhook bumps the
    // token (inside its transaction) and its own enqueue no-ops against this
    // still-active job. The bump must happen while the model is thinking —
    // eligibility re-reads state before generation, so a bump before process()
    // would simply be absorbed as the newest token.
    scripted(async () => {
      await prisma.conversationAiState.update({
        where: { conversationId },
        data: { turnSeq: { increment: 1 } },
      });
    }, chatText('رد المساعد.'));
    await processTurn(conversationId, turn.id);

    const finished = await prisma.aiTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    expect(finished.status).toBe('SUPPRESSED');
    const messages = await prisma.inboxMessage.findMany({
      where: { conversationId, authorType: 'AI_AGENT' },
    });
    expect(messages).toHaveLength(0);
    expect(followUps).toEqual([{ conversationId, fencedTurnId: turn.id }]);
  }, 30_000);

  it('does not re-enqueue when a human took over the conversation', async () => {
    const conversationId = await createConversation('whatsapp');
    await inbound(conversationId, 'رسالة العميل');
    const turn = await mintTurn(conversationId);
    const human = await prisma.account.findFirstOrThrow({
      where: { status: 'ACTIVE', id: { not: serviceAccountId } },
    });
    await inbox.sendReply(
      {
        accountId: human.id,
        displayName: human.displayName,
        email: `${human.id}@example.com`,
        sessionId: randomUUID(),
        roles: [],
        permissionKeys: ['inbox.view.all', 'inbox.reply'],
        organizationWide: true,
        authenticatedAt: new Date().toISOString(),
      },
      conversationId,
      { body: 'أنا أتابع معك.', retryToken: randomUUID(), attachments: [] },
    );
    sent.length = 0;
    scripted(chatText('رد متأخر.'));
    await processTurn(conversationId, turn.id);

    // The human's reply paused the conversation, so the turn is skipped at S1
    // — before any model spend — and nothing re-triggers the AI.
    const finished = await prisma.aiTurn.findUniqueOrThrow({
      where: { id: turn.id },
    });
    expect(finished.status).toBe('SKIPPED');
    expect(finished.skipReason).toBe('mode-paused');
    expect(followUps).toEqual([]);
    expect(sent).toEqual([]);
  }, 30_000);

  it('trips the error budget on three exhausted turns, not on retries', async () => {
    const conversationId = await createConversation('whatsapp');
    await inbound(conversationId, 'سؤال');

    // A mid-retry attempt must keep the turn RUNNING and not count a failure.
    const turnOne = await mintTurn(conversationId);
    scripted(new Error('LLM down'));
    await expect(processTurn(conversationId, turnOne.id, 0)).rejects.toThrow(
      'LLM down',
    );
    expect(
      (await prisma.aiTurn.findUniqueOrThrow({ where: { id: turnOne.id } }))
        .status,
    ).toBe('RUNNING');
    expect(
      (
        await prisma.conversationAiState.findUniqueOrThrow({
          where: { conversationId },
        })
      ).consecutiveFailures,
    ).toBe(0);

    // The final attempt marks the turn FAILED and counts one failure.
    scripted(new Error('LLM down'));
    await expect(processTurn(conversationId, turnOne.id, 2)).rejects.toThrow(
      'LLM down',
    );
    expect(
      (await prisma.aiTurn.findUniqueOrThrow({ where: { id: turnOne.id } }))
        .status,
    ).toBe('FAILED');
    expect(
      (
        await prisma.conversationAiState.findUniqueOrThrow({
          where: { conversationId },
        })
      ).consecutiveFailures,
    ).toBe(1);

    for (let index = 0; index < 2; index += 1) {
      await inbound(conversationId, `سؤال إضافي ${index}`);
      const turn = await mintTurn(conversationId);
      scripted(new Error('LLM down'));
      await expect(processTurn(conversationId, turn.id, 2)).rejects.toThrow(
        'LLM down',
      );
    }
    const state = await prisma.conversationAiState.findUniqueOrThrow({
      where: { conversationId },
    });
    expect(state.consecutiveFailures).toBe(3);
    expect(state.mode).toBe('PAUSED');
    expect(state.pausedReason).toBe('ERROR_BUDGET');
    expect(state.resumeAt).toBeNull();
    const messages = await prisma.inboxMessage.findMany({
      where: { conversationId, authorType: 'AI_AGENT' },
    });
    expect(messages).toHaveLength(0);
  }, 45_000);

  it('mints follow-up jobs with a BullMQ-safe, collision-free id', async () => {
    const conversationId =
      conversationIds.at(-1) ?? (await createConversation('whatsapp'));
    const add = jest.fn<
      Promise<void>,
      [
        string,
        unknown,
        { jobId: string; removeOnComplete: boolean; removeOnFail: boolean },
      ]
    >();
    const service = new AiTurnEnqueueService(
      prisma as never,
      { add } as unknown as Queue,
    );
    await service.enqueueFollowUp(conversationId, 'fenced-turn');
    const [, , options] = add.mock.calls[0];
    expect(options.jobId).toBe(`ai-${conversationId}-after-fenced-turn`);
    expect(options.jobId).not.toContain(':');
    expect(options.removeOnComplete).toBe(true);
    expect(options.removeOnFail).toBe(true);
  }, 30_000);
});
