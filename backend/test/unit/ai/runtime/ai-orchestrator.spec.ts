import { AiOrchestratorService } from '../../../../src/modules/ai/runtime/ai-orchestrator.service';
import { CrmReadContactTool } from '../../../../src/modules/ai/tools/crm-read-contact.tool';
import { KbSearchTool } from '../../../../src/modules/ai/tools/kb-search.tool';
import type { KnowledgeRepository } from '../../../../src/modules/ai/knowledge/knowledge.repository';
import type {
  OpenAiClient,
  ChatResult,
} from '../../../../src/modules/ai/llm/openai.client';
import type { PrismaService } from '../../../../src/database/prisma.service';
import type { AiRunContext } from '../../../../src/modules/ai/tools/tool.contract';

const context: AiRunContext = {
  organizationId: 'org-1',
  conversationId: 'conv-1',
  agentId: 'agent-1',
  aiTurnId: 'turn-1',
  customerId: 'customer-1',
  contactId: null,
  knowledgeBaseIds: ['kb-1'],
  retrievalTopK: 6,
  retrievalMinScore: 0.35,
};

const chatResult = (overrides: Partial<ChatResult> = {}): ChatResult => ({
  content: '',
  toolCalls: [],
  promptTokens: 10,
  completionTokens: 5,
  ...overrides,
});

const harness = (options: { chat: jest.Mock; search?: jest.Mock }) => {
  const knowledge = {
    search: options.search ?? jest.fn().mockResolvedValue([]),
  } as unknown as KnowledgeRepository;
  const openAi = {
    chat: options.chat,
    // The kb_search tool embeds the query before searching; the search
    // repository is stubbed, so any embedding will do.
    embed: jest.fn().mockResolvedValue([[1, 0]]),
  } as unknown as OpenAiClient;
  const record = jest.fn<Promise<unknown>, [data: unknown]>();
  const db = {
    aiToolExecution: { create: record },
  } as unknown as PrismaService;
  const service = new AiOrchestratorService(
    openAi,
    db,
    new KbSearchTool(knowledge, openAi),
    new CrmReadContactTool(db),
  );
  return { service, record };
};

const run = (
  service: AiOrchestratorService,
  history: Parameters<AiOrchestratorService['run']>[0]['history'] = [
    {
      role: 'user',
      content: '<customer_message>\nكم السعر؟\n</customer_message>',
    },
  ],
  customerAsked = true,
) =>
  service.run({
    system: 'system',
    history,
    context,
    maxTokens: 600,
    temperature: 0.3,
    fallbackMessage: 'عذرًا، سأحوّلك إلى موظف.',
    maxToolCalls: 4,
    customerAsked,
  });

describe('AiOrchestratorService grounding', () => {
  it('sends a reply that cites retrieved passages', async () => {
    const chat = jest
      .fn()
      .mockResolvedValueOnce(
        chatResult({
          toolCalls: [
            { id: 'c1', name: 'kb_search', arguments: '{"query":"السعر"}' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        chatResult({ content: 'الرسوم 500 ريال شهريًا.' }),
      );
    const search = jest.fn().mockResolvedValue([
      {
        id: 'chunk-1',
        sourceTitle: 's',
        heading: null,
        content: 'الرسوم 500',
      },
    ]);
    const { service } = harness({ chat, search });
    const result = await run(service);
    expect(result.reply).toBe('الرسوم 500 ريال شهريًا.');
    expect(result.usedFallback).toBe(false);
    expect(result.grounded).toBe(true);
    expect(result.citedChunkIds).toEqual(['chunk-1']);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBaseIds: ['kb-1'],
        organizationId: 'org-1',
      }),
    );
  });

  it('replaces an ungrounded factual answer with the fallback when the model searched and found nothing', async () => {
    const chat = jest
      .fn()
      .mockResolvedValueOnce(
        chatResult({
          toolCalls: [
            { id: 'c1', name: 'kb_search', arguments: '{"query":"السعر"}' },
          ],
        }),
      )
      .mockResolvedValueOnce(chatResult({ content: 'الرسوم 500 ريال.' }));
    const { service } = harness({
      chat,
      search: jest.fn().mockResolvedValue([]),
    });
    const result = await run(service);
    expect(result.usedFallback).toBe(true);
    expect(result.reply).toBe('عذرًا، سأحوّلك إلى موظف.');
    expect(result.citedChunkIds).toEqual([]);
  });

  it('replaces an ungrounded factual answer when the model never searched for a customer question', async () => {
    // The confident-invention hole: a direct factual answer with no kb_search
    // call at all must fall back just like an empty search result.
    const chat = jest
      .fn()
      .mockResolvedValueOnce(chatResult({ content: 'الرسوم 500 ريال.' }));
    const { service } = harness({ chat });
    const result = await run(service);
    expect(result.usedFallback).toBe(true);
  });

  it('lets a clarifying question through without grounding', async () => {
    const chat = jest
      .fn()
      .mockResolvedValueOnce(
        chatResult({ content: 'هل تقصد دورة اللغة الإنجليزية؟' }),
      );
    const { service } = harness({ chat });
    const result = await run(service);
    expect(result.usedFallback).toBe(false);
    expect(result.reply).toBe('هل تقصد دورة اللغة الإنجليزية؟');
  });

  it('lets short conversation pass when the customer asked nothing and no search happened', async () => {
    const chat = jest
      .fn()
      .mockResolvedValueOnce(chatResult({ content: 'عفوًا، نخدمك دائمًا!' }));
    const { service } = harness({ chat });
    const result = await run(
      service,
      [
        {
          role: 'user',
          content: '<customer_message>\nشكرًا لك\n</customer_message>',
        },
      ],
      false,
    );
    expect(result.usedFallback).toBe(false);
  });

  it('falls back when the model returns nothing at all', async () => {
    const chat = jest
      .fn()
      .mockResolvedValueOnce(chatResult({ content: '   ' }));
    const { service } = harness({ chat });
    const result = await run(service);
    expect(result.usedFallback).toBe(true);
  });

  it('falls back when the iteration budget is exhausted without an answer', async () => {
    const chat = jest.fn().mockResolvedValue(
      chatResult({
        toolCalls: [
          { id: 'c1', name: 'kb_search', arguments: '{"query":"x"}' },
        ],
      }),
    );
    const { service } = harness({ chat });
    const result = await run(service);
    expect(result.usedFallback).toBe(true);
    expect(chat).toHaveBeenCalledTimes(4);
  });
});

describe('AiOrchestratorService tool handling', () => {
  it('records a denied unknown tool and tells the model', async () => {
    const chat = jest
      .fn()
      .mockResolvedValueOnce(
        chatResult({
          toolCalls: [{ id: 'c1', name: 'delete_everything', arguments: '{}' }],
        }),
      )
      .mockResolvedValueOnce(chatResult({ content: 'حسنًا.' }));
    const { service, record } = harness({ chat });
    await run(service);
    const audited = record.mock.calls.map(
      (call) => call[0] as { data: Record<string, unknown> },
    );
    const denied = audited.find((entry) => entry.data.outcome === 'DENIED');
    expect(denied?.data.toolName).toBe('delete_everything');
  });

  it('returns a validation error to the model instead of throwing', async () => {
    const chat = jest
      .fn()
      .mockResolvedValueOnce(
        chatResult({
          toolCalls: [{ id: 'c1', name: 'kb_search', arguments: 'not json' }],
        }),
      )
      .mockResolvedValueOnce(chatResult({ content: 'هل يمكنك توضيح سؤالك؟' }));
    const { service, record } = harness({ chat });
    const result = await run(service);
    expect(result.usedFallback).toBe(false);
    const audited = record.mock.calls.map(
      (call) => call[0] as { data: Record<string, unknown> },
    );
    const invalid = audited.find(
      (entry) => entry.data.outcome === 'VALIDATION_ERROR',
    );
    expect(invalid?.data.toolName).toBe('kb_search');
  });

  it('stops executing tools once the per-turn budget is spent', async () => {
    const chat = jest.fn().mockResolvedValue(
      chatResult({
        toolCalls: [
          { id: 'c1', name: 'kb_search', arguments: '{"query":"x"}' },
        ],
      }),
    );
    const search = jest
      .fn()
      .mockResolvedValue([
        { id: 'chunk-1', sourceTitle: 's', heading: null, content: 'c' },
      ]);
    const { service, record } = harness({ chat, search });
    await service.run({
      system: 'system',
      history: [],
      context,
      maxTokens: 600,
      temperature: 0.3,
      fallbackMessage: 'f',
      maxToolCalls: 2,
    });
    const outcomes = record.mock.calls.map(
      (call) => (call[0] as { data: { outcome: string } }).data.outcome,
    );
    expect(outcomes.filter((outcome) => outcome === 'SUCCESS')).toHaveLength(2);
    expect(
      outcomes.filter((outcome) => outcome === 'DENIED').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
