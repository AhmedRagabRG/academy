import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  fenceUntrusted,
  looksLikeInjection,
} from '../guards/prompt-injection.guard';
import type { ChatMessage } from '../llm/openai.client';

/** Recent turns only. Long conversations get a summary in a later phase. */
const WINDOW = 20;
/** Rough ceiling so one enormous message cannot blow the context. */
const MAX_CHARS_PER_MESSAGE = 2000;

@Injectable()
export class AiContextService {
  constructor(private readonly db: PrismaService) {}

  /**
   * The conversation as the model sees it. Customer text is fenced rather than
   * concatenated: everything inside the fence is data, and the system prompt
   * says so. Suppressed drafts are excluded — the customer never saw them, so
   * including them would make the model believe it already answered.
   */
  async build(conversationId: string): Promise<{
    messages: ChatMessage[];
    injectionSuspected: boolean;
    customerAsked: boolean;
  }> {
    const rows = await this.db.inboxMessage.findMany({
      where: {
        conversationId,
        delivery: { notIn: ['SUPPRESSED', 'FAILED'] },
      },
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      take: WINDOW,
      select: { direction: true, authorType: true, body: true },
    });

    let injectionSuspected = false;
    let customerAsked = false;
    const messages: ChatMessage[] = rows
      .reverse()
      .filter((row) => row.body.trim().length > 0)
      .map((row) => {
        const body = row.body.slice(0, MAX_CHARS_PER_MESSAGE);
        if (row.direction === 'INCOMING') {
          if (looksLikeInjection(body)) injectionSuspected = true;
          // The turn answers the newest customer message; whether it asked
          // decides how strictly the grounding check judges the reply.
          customerAsked = /[?؟]/.test(body);
          return {
            role: 'user' as const,
            content: fenceUntrusted('customer_message', body),
          };
        }
        return { role: 'assistant' as const, content: body };
      });

    return { messages, injectionSuspected, customerAsked };
  }

  /** What the prompt may state as already known, without leaking the values. */
  async contactSummary(contactId: string | null) {
    if (!contactId) return null;
    const contact = await this.db.contact.findFirst({
      where: { id: contactId, deletedAt: null },
      select: { name: true, email: true, phone: true },
    });
    if (!contact) return null;
    return {
      name: contact.name || null,
      hasEmail: Boolean(contact.email),
      hasPhone: Boolean(contact.phone),
    };
  }
}
