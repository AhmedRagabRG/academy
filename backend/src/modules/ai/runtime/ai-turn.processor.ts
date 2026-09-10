import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../database/prisma.service';
import { InboxService } from '../../inbox/inbox.service';
import { AI_TURN_QUEUE } from '../../../queue/queue.constants';
import { buildSystemPrompt } from '../prompts/system-prompt.builder';
import { AiContextService } from './ai-context.service';
import { AiEligibilityService } from './ai-eligibility.service';
import { AiOrchestratorService } from './ai-orchestrator.service';

export interface AiTurnJob {
  conversationId: string;
  aiTurnId: string;
}

/** Three consecutive failures on one conversation stop the AI rather than loop at a customer. */
const FAILURE_BUDGET = 3;

@Processor(AI_TURN_QUEUE)
export class AiTurnProcessor extends WorkerHost {
  private readonly logger = new Logger(AiTurnProcessor.name);

  constructor(
    private readonly db: PrismaService,
    private readonly eligibility: AiEligibilityService,
    private readonly context: AiContextService,
    private readonly orchestrator: AiOrchestratorService,
    private readonly inbox: InboxService,
  ) {
    super();
  }

  async process(job: Job<AiTurnJob>): Promise<void> {
    const { conversationId, aiTurnId } = job.data;
    const startedAt = performance.now();

    const turn = await this.db.aiTurn.findUnique({ where: { id: aiTurnId } });
    if (!turn) return;

    // A retry whose message already committed must NOT re-decide whether to
    // speak — that decision was made and persisted. Re-attempt dispatch only.
    const existing = await this.db.inboxMessage.findUnique({
      where: {
        conversationId_retryToken: {
          conversationId,
          retryToken: `ai:${aiTurnId}`,
        },
      },
      select: { id: true },
    });
    if (existing) {
      await this.retryDispatch(turn, conversationId);
      return;
    }

    const check = await this.eligibility.check(conversationId);
    if (!check.eligible) {
      await this.finish(aiTurnId, 'SKIPPED', { skipReason: check.reason });
      return;
    }

    await this.db.aiTurn.update({
      where: { id: aiTurnId },
      data: { status: 'RUNNING', turnSeqAtStart: check.turnSeq },
    });

    try {
      const [{ messages, injectionSuspected }, contact] = await Promise.all([
        this.context.build(conversationId),
        this.context.contactSummary(check.contactId),
      ]);
      if (injectionSuspected)
        this.logger.warn({
          conversationId,
          aiTurnId,
          message: 'customer text matched an injection heuristic',
        });
      if (!messages.length) {
        await this.finish(aiTurnId, 'SKIPPED', { skipReason: 'empty-context' });
        return;
      }

      const agent = check.agent;
      const result = await this.orchestrator.run({
        system: buildSystemPrompt(agent, contact),
        history: messages,
        context: {
          organizationId: check.organizationId,
          conversationId,
          agentId: agent.id,
          aiTurnId,
          customerId: check.customerId,
          contactId: check.contactId,
          knowledgeBaseIds: check.knowledgeBaseIds,
          retrievalTopK: agent.retrievalTopK,
          retrievalMinScore: agent.retrievalMinScore,
        },
        maxTokens: Math.ceil(agent.maxResponseChars / 2),
        temperature: agent.temperature,
        fallbackMessage: agent.fallbackMessage,
        maxToolCalls: agent.maxToolCallsPerTurn,
      });

      const sent = await this.inbox.sendAiReply({
        conversationId,
        agentId: agent.id,
        serviceAccountId: agent.serviceAccountId,
        agentDisplayName: agent.name,
        aiTurnId,
        body: result.reply.slice(0, agent.maxResponseChars),
        expectedTurnSeq: check.turnSeq,
      });

      await this.finish(
        aiTurnId,
        sent.status === 'sent'
          ? 'REPLIED'
          : sent.status === 'suppressed'
            ? 'SUPPRESSED'
            : 'FAILED',
        {
          messageId: sent.messageId ?? null,
          model: agent.model,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          retrievedChunkIds: result.citedChunkIds,
          latencyMs: Math.round(performance.now() - startedAt),
          skipReason: result.usedFallback ? 'fallback-used' : null,
        },
      );
      await this.recordOutcome(conversationId, sent.status !== 'failed');

      if (sent.status === 'suppressed')
        this.logger.log({
          conversationId,
          aiTurnId,
          message: 'turn fenced out; a human or a newer message won the race',
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.finish(aiTurnId, 'FAILED', {
        errorMessage: message.slice(0, 500),
        latencyMs: Math.round(performance.now() - startedAt),
      });
      await this.recordOutcome(conversationId, false);
      throw error;
    }
  }

  /**
   * The message row already committed on an earlier attempt, so the decision to
   * speak is made and must not be revisited: no eligibility check, no LLM call,
   * no fencing guard. sendAiReply finds the existing row by its stable
   * retryToken and goes straight to the dispatch guard, which is still what
   * decides send-versus-suppress against the current turnSeq. Re-running
   * eligibility here would strand a committed message at QUEUED forever
   * whenever a human replied between the two attempts.
   */
  private async retryDispatch(
    turn: { id: string; agentId: string; turnSeqAtStart: number },
    conversationId: string,
  ): Promise<void> {
    const agent = await this.db.aiAgent.findUnique({
      where: { id: turn.agentId },
      select: { id: true, name: true, serviceAccountId: true },
    });
    if (!agent) {
      await this.finish(turn.id, 'FAILED', {
        errorMessage: 'agent missing on dispatch retry',
      });
      return;
    }
    this.logger.log({
      conversationId,
      aiTurnId: turn.id,
      message: 'message already committed; retrying dispatch only',
    });
    const sent = await this.inbox.sendAiReply({
      conversationId,
      agentId: agent.id,
      serviceAccountId: agent.serviceAccountId,
      agentDisplayName: agent.name,
      aiTurnId: turn.id,
      // Body is ignored on this path: the committed row wins. Passing the
      // placeholder keeps the non-empty guard satisfied without re-generating.
      body: 'retry',
      expectedTurnSeq: turn.turnSeqAtStart,
    });
    await this.finish(
      turn.id,
      sent.status === 'sent'
        ? 'REPLIED'
        : sent.status === 'suppressed'
          ? 'SUPPRESSED'
          : 'FAILED',
      { messageId: sent.messageId ?? null },
    );
  }

  private async finish(
    aiTurnId: string,
    status: 'REPLIED' | 'SUPPRESSED' | 'SKIPPED' | 'FAILED',
    data: Record<string, unknown> = {},
  ): Promise<void> {
    await this.db.aiTurn.update({
      where: { id: aiTurnId },
      data: { status, finishedAt: new Date(), ...data },
    });
  }

  /**
   * Repeated failure pauses the conversation instead of retrying at a customer
   * forever. A success clears the counter.
   */
  private async recordOutcome(
    conversationId: string,
    ok: boolean,
  ): Promise<void> {
    if (ok) {
      await this.db.conversationAiState.updateMany({
        where: { conversationId },
        data: { consecutiveFailures: 0 },
      });
      return;
    }
    const state = await this.db.conversationAiState.findUnique({
      where: { conversationId },
      select: { consecutiveFailures: true },
    });
    const failures = (state?.consecutiveFailures ?? 0) + 1;
    await this.db.conversationAiState.updateMany({
      where: { conversationId },
      data:
        failures >= FAILURE_BUDGET
          ? {
              consecutiveFailures: failures,
              mode: 'PAUSED',
              pausedReason: 'ERROR_BUDGET',
              pausedAt: new Date(),
              resumeAt: null,
              turnSeq: { increment: 1 },
            }
          : { consecutiveFailures: failures },
    });
  }
}
