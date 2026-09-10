import { Injectable } from '@nestjs/common';
import { TicketService } from '../../tickets/ticket.service';
import type { AiRunContext, AgentTool, ToolResult } from './tool.contract';
import { jsonSchema } from './tool.contract';
import { AiCallerContextService } from '../runtime/ai-caller-context.service';
import { ToolBudgetService } from './tool-budget.service';
import { TicketRoutingService } from './ticket-routing.service';
import type { ChatTool } from '../llm/openai.client';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

interface CreateTicketInput {
  title: string;
  description: string;
  priority: (typeof PRIORITIES)[number];
  category: string;
  confidence: number;
}

/**
 * Escalates to a human by creating a ticket through TicketService — every
 * validation the human path applies applies here unchanged, because the AI
 * acts as its real restricted account (the role holds exactly tickets.create).
 * The team is decided by the deterministic resolver, never by the model, and
 * one ticket per conversation per day is enforced from the audit ledger so a
 * looping model cannot spam tickets.
 */
@Injectable()
export class CreateTicketTool implements AgentTool {
  readonly name = 'create_ticket';

  constructor(
    private readonly tickets: TicketService,
    private readonly routing: TicketRoutingService,
    private readonly caller: AiCallerContextService,
    private readonly budget: ToolBudgetService,
  ) {}

  definition(context: AiRunContext): ChatTool {
    const categories = context.routingCategories;
    return {
      type: 'function',
      function: {
        name: 'create_ticket',
        description:
          'حوّل الحالة إلى موظف بشري بإنشاء تذكرة، عندما يطلب العميل ذلك أو عندما لا تستطيع المساعدة.',
        parameters: jsonSchema(
          {
            title: { type: 'string', description: 'عنوان قصير للتذكرة' },
            description: {
              type: 'string',
              description: 'ملخص ما طلب العميل وما حاولتَه',
            },
            priority: {
              type: 'string',
              enum: [...PRIORITIES],
              description: 'الأولوية المقترحة',
            },
            category: {
              type: 'string',
              enum: categories.map((entry) => entry.category),
              description: 'نوع الحالة — اختر من القائمة فقط',
            },
            confidence: {
              type: 'number',
              description: 'ثقتك من 0 إلى 1 في اختيار التصنيف',
            },
          },
          ['title', 'description', 'priority', 'category', 'confidence'],
        ),
      },
    };
  }

  parse(
    raw: string,
  ): { ok: true; input: CreateTicketInput } | { ok: false; error: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'arguments must be valid JSON' };
    }
    if (typeof parsed !== 'object' || parsed === null)
      return { ok: false, error: 'arguments must be an object' };
    const source = parsed as Record<string, unknown>;
    const title = typeof source.title === 'string' ? source.title.trim() : '';
    const description =
      typeof source.description === 'string' ? source.description.trim() : '';
    const category =
      typeof source.category === 'string' ? source.category.trim() : '';
    const priority = PRIORITIES.includes(source.priority as never)
      ? (source.priority as CreateTicketInput['priority'])
      : null;
    const confidence =
      typeof source.confidence === 'number' &&
      source.confidence >= 0 &&
      source.confidence <= 1
        ? source.confidence
        : null;
    if (title.length < 3 || title.length > 160)
      return { ok: false, error: 'title must be 3-160 characters' };
    if (description.length < 3)
      return { ok: false, error: 'description is required' };
    if (!category) return { ok: false, error: 'category is required' };
    if (!priority)
      return {
        ok: false,
        error: 'priority must be low, medium, high or critical',
      };
    if (confidence === null)
      return {
        ok: false,
        error: 'confidence must be a number between 0 and 1',
      };
    return {
      ok: true,
      input: {
        title,
        description: description.slice(0, 2000),
        priority,
        category,
        confidence,
      },
    };
  }

  async execute(
    input: CreateTicketInput,
    context: AiRunContext,
  ): Promise<ToolResult> {
    if (
      (await this.budget.perConversationPerDay(
        context.conversationId,
        this.name,
      )) >= 1
    )
      return {
        content: JSON.stringify({
          created: false,
          note: 'تم إنشاء تذكرة لهذه المحادثة خلال آخر 24 ساعة — لا تنشئ أخرى.',
        }),
      };

    const known = context.routingCategories.some(
      (entry) => entry.category === input.category,
    );
    if (!known)
      return {
        content: JSON.stringify({
          created: false,
          note: `التصنيف "${input.category}" غير متاح. اختر من: ${context.routingCategories
            .map((entry) => entry.category)
            .join('، ')}`,
        }),
      };

    const decision = await this.routing.resolve({
      organizationId: context.organizationId,
      agentId: context.agentId,
      category: input.category,
      confidence: input.confidence,
      routingMinConfidence: context.routingMinConfidence,
    });

    const caller = await this.caller.forAccount(context.serviceAccountId);
    const description = decision.routingNote
      ? `${input.description}\n\n[${decision.routingNote}]`
      : input.description;
    // The rule's priority is the admin's standing instruction; the model's
    // estimate is only a hint. teamId comes solely from the resolver.
    const ticket = await this.tickets.create(caller, {
      title: input.title,
      description,
      status: 'backlog',
      priority: decision.priority,
      teamId: decision.teamId ?? undefined,
      customerId: context.customerId,
      conversationId: context.conversationId,
      tags: decision.tags,
    });

    return {
      content: JSON.stringify({
        created: true,
        number: ticket.number,
        assigned: decision.teamId !== null,
      }),
      effect: 'escalated',
    };
  }
}
