import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export type SkipReason =
  | 'agent-missing'
  | 'agent-disabled'
  | 'channel-disabled'
  | 'no-ai-state'
  | 'mode-off'
  | 'mode-paused'
  | 'conversation-closed'
  | 'no-knowledge-base'
  | 'not-configured';

export interface EligibleTurn {
  eligible: true;
  turnSeq: number;
  agent: Awaited<ReturnType<PrismaService['aiAgent']['findFirst']>> & object;
  knowledgeBaseIds: string[];
  conversationId: string;
  organizationId: string;
  customerId: string;
  contactId: string | null;
  platformCode: string;
}

@Injectable()
export class AiEligibilityService {
  constructor(private readonly db: PrismaService) {}

  /**
   * Everything that can stop a turn before any money is spent. Runs before the
   * LLM call on purpose: the expensive path should never be reached for a
   * conversation a human has already taken over.
   *
   * Also applies the lazy auto-resume. The sweeper is authoritative, but a due
   * conversation that receives a message before the next sweep should not be
   * answered as though it were still paused.
   */
  async check(
    conversationId: string,
  ): Promise<EligibleTurn | { eligible: false; reason: SkipReason }> {
    const conversation = await this.db.inboxConversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        customerId: true,
        status: true,
        platform: { select: { code: true } },
        customer: { select: { contactId: true } },
      },
    });
    if (!conversation || conversation.status === 'ARCHIVED')
      return { eligible: false, reason: 'conversation-closed' };

    const state = await this.db.conversationAiState.findUnique({
      where: { conversationId },
    });
    if (!state) return { eligible: false, reason: 'no-ai-state' };
    if (state.mode === 'OFF') return { eligible: false, reason: 'mode-off' };

    let turnSeq = state.turnSeq;
    if (state.mode === 'PAUSED') {
      const due =
        state.resumeAt !== null &&
        state.resumeAt <= new Date() &&
        (state.pausedReason === 'HUMAN_REPLY' || state.pausedReason === 'MANUAL');
      if (!due) return { eligible: false, reason: 'mode-paused' };
      const resumed = await this.db.conversationAiState.updateMany({
        where: { conversationId, turnSeq, mode: 'PAUSED' },
        data: {
          mode: 'AUTO',
          pausedReason: null,
          pausedAt: null,
          resumeAt: null,
          turnSeq: { increment: 1 },
          version: { increment: 1 },
        },
      });
      if (resumed.count !== 1) return { eligible: false, reason: 'mode-paused' };
      turnSeq += 1;
    }

    const agent = await this.db.aiAgent.findFirst({
      where: { id: state.agentId, organizationId: conversation.organizationId },
      include: { knowledgeBases: { select: { knowledgeBaseId: true } } },
    });
    if (!agent) return { eligible: false, reason: 'agent-missing' };
    if (!agent.enabled) return { eligible: false, reason: 'agent-disabled' };
    if (!agent.enabledPlatformCodes.includes(conversation.platform.code))
      return { eligible: false, reason: 'channel-disabled' };

    const knowledgeBaseIds = agent.knowledgeBases.map((row) => row.knowledgeBaseId);
    if (!knowledgeBaseIds.length)
      return { eligible: false, reason: 'no-knowledge-base' };

    return {
      eligible: true,
      turnSeq,
      agent,
      knowledgeBaseIds,
      conversationId,
      organizationId: conversation.organizationId,
      customerId: conversation.customerId,
      contactId: conversation.customer.contactId,
      platformCode: conversation.platform.code,
    };
  }
}
