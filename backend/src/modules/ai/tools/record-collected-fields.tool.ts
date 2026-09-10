import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { AiRunContext, AgentTool, ToolResult } from './tool.contract';
import { jsonSchema } from './tool.contract';
import type { ChatTool } from '../llm/openai.client';

interface CollectedInput {
  collected: Record<string, string>;
  asked: string[];
}

/**
 * Persists data-collection progress on the conversation's AI state, so the
 * agent never re-asks for something it already has (the system prompt is told
 * what is known) and never re-asks a question it already asked (askedFields).
 * Keys are validated against the agent's configured fields — the model cannot
 * invent new collection slots.
 *
 * No write budget: unlike the note and contact tools this touches only the
 * conversation's own AI state, the merge is idempotent, and the orchestrator's
 * per-turn tool cap already bounds how often it can run.
 */
@Injectable()
export class RecordCollectedFieldsTool implements AgentTool {
  readonly name = 'record_collected_fields';

  constructor(private readonly db: PrismaService) {}

  definition(_context: AiRunContext): ChatTool {
    return {
      type: 'function',
      function: {
        name: 'record_collected_fields',
        description:
          'سجّل البيانات التي ذكرها العميل أثناء المحادثة، والأسئلة التي طرحتها عليه، حتى لا تسأله مرة أخرى.',
        parameters: jsonSchema(
          {
            collected: {
              type: 'object',
              description: 'القيم التي ذكرها العميل، مفتاح لكل حقل',
              properties: {},
              additionalProperties: { type: 'string' },
            },
            asked: {
              type: 'array',
              description: 'مفاتيح الحقول التي سألت عنها',
              items: { type: 'string' },
            },
          },
          [],
        ),
      },
    };
  }

  parse(
    raw: string,
  ): { ok: true; input: CollectedInput } | { ok: false; error: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'arguments must be valid JSON' };
    }
    if (typeof parsed !== 'object' || parsed === null)
      return { ok: false, error: 'arguments must be an object' };
    const source = parsed as Record<string, unknown>;
    const collected: Record<string, string> = {};
    const collectedRaw =
      typeof source.collected === 'object' && source.collected !== null
        ? (source.collected as Record<string, unknown>)
        : {};
    for (const [key, value] of Object.entries(collectedRaw)) {
      if (typeof value !== 'string')
        return { ok: false, error: 'collected values must be strings' };
      collected[key] = value.trim().slice(0, 300);
    }
    const asked = Array.isArray(source.asked)
      ? source.asked.filter((key): key is string => typeof key === 'string')
      : [];
    return { ok: true, input: { collected, asked } };
  }

  async execute(
    input: CollectedInput,
    context: AiRunContext,
  ): Promise<ToolResult> {
    const knownKeys = new Set(
      context.collectionFields.map((field) => field.key),
    );
    const unknownKeys = [
      ...new Set([...Object.keys(input.collected), ...input.asked]),
    ].filter((key) => !knownKeys.has(key));
    if (unknownKeys.length)
      return {
        content: JSON.stringify({
          saved: false,
          note: `حقول غير معرفة: ${unknownKeys.join('، ')}`,
        }),
      };

    const state = await this.db.conversationAiState.findUnique({
      where: { conversationId: context.conversationId },
      select: { collectedFields: true, askedFields: true },
    });
    if (!state)
      return {
        content: JSON.stringify({ saved: false, note: 'لا توجد حالة محادثة.' }),
      };

    const merged = {
      collectedFields: {
        ...(typeof state.collectedFields === 'object' &&
        state.collectedFields !== null
          ? (state.collectedFields as Record<string, string>)
          : {}),
        ...input.collected,
      },
      askedFields: [
        ...new Set([
          ...(Array.isArray(state.askedFields)
            ? (state.askedFields as string[])
            : []),
          ...input.asked,
        ]),
      ],
    };

    await this.db.conversationAiState.update({
      where: { conversationId: context.conversationId },
      data: {
        collectedFields: merged.collectedFields,
        askedFields: merged.askedFields,
      },
    });
    return { content: JSON.stringify({ saved: true }) };
  }
}
