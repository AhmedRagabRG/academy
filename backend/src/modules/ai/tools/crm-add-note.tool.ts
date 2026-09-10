import { Injectable } from '@nestjs/common';
import { ContactService } from '../../contacts/contact.service';
import type { AiRunContext, AgentTool, ToolResult } from './tool.contract';
import { jsonSchema } from './tool.contract';
import { AiCallerContextService } from '../runtime/ai-caller-context.service';
import { ToolBudgetService } from './tool-budget.service';
import type { ChatTool } from '../llm/openai.client';

const MAX_NOTES_PER_TURN = 2;
const MAX_CONTENT_CHARS = 1000;

interface AddNoteInput {
  content: string;
}

/**
 * Records useful context on the customer's CRM record. Appends only — there
 * is no edit and no delete, so the note trail stays honest about who wrote
 * what: the author is the AI service account, under its own display name.
 */
@Injectable()
export class CrmAddNoteTool implements AgentTool {
  readonly name = 'crm_add_note';

  constructor(
    private readonly contacts: ContactService,
    private readonly caller: AiCallerContextService,
    private readonly budget: ToolBudgetService,
  ) {}

  definition(_context: AiRunContext): ChatTool {
    return {
      type: 'function',
      function: {
        name: 'crm_add_note',
        description:
          'سجّل معلومة مهمة ذكرها العميل في ملاحظات ملفه (تفضيلات، التزامات، سياق يفيد الموظف).',
        parameters: jsonSchema(
          {
            content: {
              type: 'string',
              description: 'نص الملاحظة باختصار',
            },
          },
          ['content'],
        ),
      },
    };
  }

  parse(
    raw: string,
  ): { ok: true; input: AddNoteInput } | { ok: false; error: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'arguments must be valid JSON' };
    }
    const content =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>).content
        : undefined;
    if (typeof content !== 'string' || !content.trim())
      return { ok: false, error: 'content is required' };
    if (content.trim().length > MAX_CONTENT_CHARS)
      return {
        ok: false,
        error: `content must be under ${MAX_CONTENT_CHARS} characters`,
      };
    return { ok: true, input: { content: content.trim() } };
  }

  async execute(
    input: AddNoteInput,
    context: AiRunContext,
  ): Promise<ToolResult> {
    if (!context.contactId)
      return {
        content: JSON.stringify({
          saved: false,
          note: 'لا يوجد سجل عميل مرتبط بهذه المحادثة.',
        }),
      };

    if (
      (await this.budget.perTurn(context.aiTurnId, this.name)) >=
      MAX_NOTES_PER_TURN
    )
      return {
        content: JSON.stringify({
          saved: false,
          note: 'تم الوصول إلى الحد الأقصى للملاحظات في هذه الرسالة.',
        }),
      };

    const caller = await this.caller.forAccount(context.serviceAccountId);
    await this.contacts.addNote(caller, context.contactId, input.content);
    return { content: JSON.stringify({ saved: true }) };
  }
}
