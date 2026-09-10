import { Injectable } from '@nestjs/common';
import type { ChatTool } from '../llm/openai.client';
import { PrismaService } from '../../../database/prisma.service';
import type { AgentTool, AiRunContext, ToolResult } from './tool.contract';
import { jsonSchema } from './tool.contract';

/**
 * Read-only view of the customer the conversation belongs to. Takes no id: the
 * contact is resolved from the run context, so the model cannot ask about
 * anyone else. The projection is an explicit allow-list rather than the row, so
 * a future column is not exposed to customers by default.
 */
@Injectable()
export class CrmReadContactTool implements AgentTool {
  readonly name = 'crm_read_contact';

  definition(_context: AiRunContext): ChatTool {
    return {
      type: 'function',
      function: {
        name: 'crm_read_contact',
        description:
          'اقرأ بيانات العميل الحالي المسجلة لدينا (الاسم، الهاتف، البريد، آخر الملاحظات) لتتجنب سؤاله عمّا نعرفه بالفعل.',
        parameters: jsonSchema({}, []),
      },
    };
  }

  constructor(private readonly db: PrismaService) {}

  parse(raw: string) {
    if (!raw.trim()) return { ok: true as const, input: {} };
    try {
      JSON.parse(raw);
      return { ok: true as const, input: {} };
    } catch {
      return { ok: false as const, error: 'arguments must be valid JSON' };
    }
  }

  async execute(_input: never, context: AiRunContext): Promise<ToolResult> {
    if (!context.contactId)
      return {
        content: JSON.stringify({
          known: false,
          note: 'لا يوجد سجل عميل مرتبط بهذه المحادثة بعد.',
        }),
      };
    const contact = await this.db.contact.findFirst({
      where: {
        id: context.contactId,
        organizationId: context.organizationId,
        deletedAt: null,
      },
      select: {
        name: true,
        phone: true,
        email: true,
        company: true,
        jobTitle: true,
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { content: true, createdAt: true },
        },
      },
    });
    if (!contact) return { content: JSON.stringify({ known: false }) };
    return {
      content: JSON.stringify({
        known: true,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
        jobTitle: contact.jobTitle,
        recentNotes: contact.notes.map((note) => note.content),
      }),
    };
  }
}
