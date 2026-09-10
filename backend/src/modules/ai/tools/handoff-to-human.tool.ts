import { Injectable } from '@nestjs/common';
import type { AiRunContext, AgentTool, ToolResult } from './tool.contract';
import { jsonSchema } from './tool.contract';
import type { ChatTool } from '../llm/openai.client';

interface HandoffInput {
  reason: string;
}

/**
 * Stops the AI and hands the conversation to a human without a ticket. The
 * tool itself only records the request: pausing mid-turn would fence out the
 * turn's own reply at the commit guard, so the ORCHESTRATOR carries the
 * effect — the configured handoff message is sent, and the conversation is
 * paused afterwards with no auto-resume. Terminal for the turn.
 */
@Injectable()
export class HandoffToHumanTool implements AgentTool {
  readonly name = 'handoff_to_human';

  definition(_context: AiRunContext): ChatTool {
    return {
      type: 'function',
      function: {
        name: 'handoff_to_human',
        description:
          'أوقف المساعد الذكي وسلّم المحادثة إلى موظف بشري، عندما يطلب العميل موظفًا أو عندما تكون الحالة خارج صلاحياتك.',
        parameters: jsonSchema(
          {
            reason: {
              type: 'string',
              description: 'سبب التحويل، بإيجاز',
            },
          },
          ['reason'],
        ),
      },
    };
  }

  parse(
    raw: string,
  ): { ok: true; input: HandoffInput } | { ok: false; error: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'arguments must be valid JSON' };
    }
    const reason =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>).reason
        : undefined;
    if (typeof reason !== 'string' || !reason.trim())
      return { ok: false, error: 'reason is required' };
    return { ok: true, input: { reason: reason.trim().slice(0, 500) } };
  }

  /**
   * Purely declarative: the actual pause and handoff message are applied by the
   * processor once the turn completes, so nothing is awaited here. The Promise
   * return keeps the AgentTool contract uniform.
   */
  execute(input: HandoffInput, _context: AiRunContext): Promise<ToolResult> {
    return Promise.resolve({
      content: JSON.stringify({
        handedOff: true,
        note: 'سيتم إرسال رسالة التسليم وإيقاف المساعد بعد انتهاء هذه الرسالة.',
        reason: input.reason,
      }),
      effect: 'handoff',
    });
  }
}
