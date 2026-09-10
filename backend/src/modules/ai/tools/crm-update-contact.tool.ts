import { Injectable } from '@nestjs/common';
import { ContactService } from '../../contacts/contact.service';
import { PrismaService } from '../../../database/prisma.service';
import type { AiRunContext, AgentTool, ToolResult } from './tool.contract';
import { jsonSchema, WRITABLE_CONTACT_FIELDS } from './tool.contract';
import { AiCallerContextService } from '../runtime/ai-caller-context.service';
import { ToolBudgetService } from './tool-budget.service';
import type { ChatTool } from '../llm/openai.client';

type WritableField = (typeof WRITABLE_CONTACT_FIELDS)[number];

const MAX_UPDATES_PER_TURN = 3;

interface UpdateFieldsInput {
  fields: Partial<Record<WritableField, string>>;
}

/**
 * Fills empty CRM fields conversationally. Only-fill-empty is deliberate and
 * has no override: the model hearing a value does not mean it may overwrite
 * what an employee recorded. Because ContactService.update has
 * full-replacement semantics, the tool always sends the CURRENT values for
 * fields it is not changing — omitting them would wipe the record.
 */
@Injectable()
export class CrmUpdateContactTool implements AgentTool {
  readonly name = 'crm_update_contact';

  constructor(
    private readonly contacts: ContactService,
    private readonly caller: AiCallerContextService,
    private readonly budget: ToolBudgetService,
    private readonly db: PrismaService,
  ) {}

  definition(context: AiRunContext): ChatTool {
    const fields = WRITABLE_CONTACT_FIELDS.filter((field) =>
      context.allowedCrmFields.includes(field),
    );
    const properties: Record<string, unknown> = Object.fromEntries(
      fields.map((field) => [
        field,
        { type: 'string', description: `قيمة ${field} إن كانت فارغة لدينا` },
      ]),
    );
    return {
      type: 'function',
      function: {
        name: 'crm_update_contact',
        description:
          'احفظ بيانات جديدة للعميل (مثل البريد أو الشركة) في الحقول الفارغة فقط. لا تستخدمها لتحديث قيم مسجلة مسبقًا.',
        parameters: jsonSchema(
          {
            fields: {
              type: 'object',
              properties,
              required: [],
              additionalProperties: false,
            },
          },
          ['fields'],
        ),
      },
    };
  }

  parse(
    raw: string,
  ): { ok: true; input: UpdateFieldsInput } | { ok: false; error: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'arguments must be valid JSON' };
    }
    const fields =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>).fields
        : undefined;
    if (typeof fields !== 'object' || fields === null)
      return { ok: false, error: 'fields object is required' };
    const cleaned: Partial<Record<WritableField, string>> = {};
    for (const [key, value] of Object.entries(
      fields as Record<string, unknown>,
    )) {
      if (key === 'phone')
        return {
          ok: false,
          error: 'phone cannot be changed — it identifies the contact',
        };
      if (!(WRITABLE_CONTACT_FIELDS as readonly string[]).includes(key))
        return { ok: false, error: `unknown field: ${key}` };
      if (typeof value !== 'string' || !value.trim())
        return { ok: false, error: `field ${key} must be a non-empty string` };
      cleaned[key as WritableField] = value.trim().slice(0, 160);
    }
    if (!Object.keys(cleaned).length)
      return { ok: false, error: 'at least one field is required' };
    return { ok: true, input: { fields: cleaned } };
  }

  async execute(
    input: UpdateFieldsInput,
    context: AiRunContext,
  ): Promise<ToolResult> {
    if (!context.contactId)
      return {
        content: JSON.stringify({
          updated: false,
          note: 'لا يوجد سجل عميل مرتبط بهذه المحادثة.',
        }),
      };

    if (
      (await this.budget.perTurn(context.aiTurnId, this.name)) >=
      MAX_UPDATES_PER_TURN
    )
      return {
        content: JSON.stringify({
          updated: false,
          note: 'تم الوصول إلى الحد الأقصى لتحديثات بيانات العميل في هذه الرسالة.',
        }),
      };

    const current = await this.db.contact.findFirst({
      where: {
        id: context.contactId,
        organizationId: context.organizationId,
        deletedAt: null,
      },
      select: {
        name: true,
        phone: true,
        email: true,
        secondaryPhone: true,
        company: true,
        jobTitle: true,
        channelHandle: true,
      },
    });
    if (!current)
      return {
        content: JSON.stringify({ updated: false, note: 'السجل غير موجود.' }),
      };

    // admin allow-list narrows at run time too, so a stale definition cannot
    // keep a field writable after the admin unchecks it.
    const allowed = context.allowedCrmFields.filter((field) =>
      (WRITABLE_CONTACT_FIELDS as readonly string[]).includes(field),
    );
    const applied: Array<{ field: string; value: string }> = [];
    const rejected: Record<string, string> = {};
    const draft: Record<string, string> = {
      name: current.name,
      phone: current.phone, // pass-through only — never taken from the model
      secondaryPhone: current.secondaryPhone ?? '',
      email: current.email ?? '',
      company: current.company ?? '',
      role: current.jobTitle ?? '',
      // ContactService.update has full-replacement semantics: every field not
      // carried through would be wiped to null.
      channelHandle: current.channelHandle ?? '',
    };

    for (const [field, value] of Object.entries(input.fields)) {
      if (!allowed.includes(field)) {
        rejected[field] = 'هذا الحقل غير مسموح به لهذا المساعد';
        continue;
      }
      const storageKey = field === 'jobTitle' ? 'role' : field;
      const existing = (current as Record<string, string | null>)[
        field === 'jobTitle' ? 'jobTitle' : field
      ];
      if (existing && existing.trim())
        rejected[field] = 'الحقل مسجل مسبقًا ولا يجوز للمساعد تعديله';
      else {
        draft[storageKey] = value;
        applied.push({ field, value });
      }
    }

    if (!applied.length)
      return {
        content: JSON.stringify({ updated: false, rejected }),
      };

    const caller = await this.caller.forAccount(context.serviceAccountId);
    await this.contacts.update(caller, context.contactId, {
      name: draft.name,
      phone: draft.phone,
      secondaryPhone: draft.secondaryPhone,
      email: draft.email,
      company: draft.company,
      role: draft.role,
      channelHandle: draft.channelHandle,
    });

    await this.contacts.addNote(
      caller,
      context.contactId,
      `المساعد الذكي حدّث بيانات العميل: ${applied
        .map(({ field, value }) => `${field} ← "${value}"`)
        .join('، ')}`,
    );

    return {
      content: JSON.stringify({
        updated: true,
        applied: applied.map((a) => a.field),
        rejected,
      }),
    };
  }
}
