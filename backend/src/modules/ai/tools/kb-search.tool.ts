import { Injectable } from '@nestjs/common';
import { KnowledgeRepository } from '../knowledge/knowledge.repository';
import type { ChatTool } from '../llm/openai.client';
import { OpenAiClient } from '../llm/openai.client';
import type { AgentTool, AiRunContext, ToolResult } from './tool.contract';
import { jsonSchema } from './tool.contract';

interface KbSearchInput {
  query: string;
}

@Injectable()
export class KbSearchTool implements AgentTool {
  readonly name = 'kb_search';

  definition(_context: AiRunContext): ChatTool {
    return {
      type: 'function',
      function: {
        name: 'kb_search',
        description:
          'ابحث في قاعدة معرفة الأكاديمية عن معلومات تخص سؤال العميل. استخدمها قبل أي إجابة تتضمن حقائق مثل الرسوم أو المواعيد أو السياسات.',
        parameters: jsonSchema(
          {
            query: {
              type: 'string',
              description: 'سؤال العميل أو العبارة المراد البحث عنها',
            },
          },
          ['query'],
        ),
      },
    };
  }

  constructor(
    private readonly knowledge: KnowledgeRepository,
    private readonly openAi: OpenAiClient,
  ) {}

  parse(raw: string) {
    try {
      const parsed = JSON.parse(raw) as Partial<KbSearchInput>;
      const query = typeof parsed.query === 'string' ? parsed.query.trim() : '';
      if (!query) return { ok: false as const, error: 'query is required' };
      if (query.length > 500)
        return {
          ok: false as const,
          error: 'query must be under 500 characters',
        };
      return { ok: true as const, input: { query } };
    } catch {
      return { ok: false as const, error: 'arguments must be valid JSON' };
    }
  }

  async execute(
    input: KbSearchInput,
    context: AiRunContext,
  ): Promise<ToolResult> {
    const [embedding] = await this.openAi.embed({ texts: [input.query] });
    // Scope is taken from the run context, never from the model. The repository
    // additionally hard-filters CUSTOMER_FACING, so an internal document is
    // unreachable here even if this call were fully attacker-controlled.
    const hits = await this.knowledge.search({
      organizationId: context.organizationId,
      knowledgeBaseIds: context.knowledgeBaseIds,
      embedding,
      topK: context.retrievalTopK,
      minScore: context.retrievalMinScore,
    });
    if (!hits.length)
      return {
        content: JSON.stringify({
          found: false,
          note: 'لا توجد معلومات في قاعدة المعرفة تغطي هذا السؤال.',
        }),
        citedChunkIds: [],
      };
    return {
      content: JSON.stringify({
        found: true,
        passages: hits.map((hit) => ({
          id: hit.id,
          source: hit.sourceTitle,
          heading: hit.heading,
          text: hit.content,
        })),
      }),
      citedChunkIds: hits.map((hit) => hit.id),
    };
  }
}
