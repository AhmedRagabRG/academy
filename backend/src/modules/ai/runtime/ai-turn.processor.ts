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
import { AiTurnEnqueueService } from './ai-turn-enqueue.service';

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
    private readonly enqueue: AiTurnEnqueueService,
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

    // Outside working hours with fallback behaviour: the configured fallback
    // is sent deterministically — no model is invoked, no retrieval, no spend.
    if (check.outsideHoursFallback) {
      const sent = await this.inbox.sendAiReply({
        conversationId,
        agentId: check.agent.id,
        serviceAccountId: check.agent.serviceAccountId,
        agentDisplayName: check.agent.name,
        aiTurnId,
        body: check.agent.fallbackMessage,
        expectedTurnSeq: check.turnSeq,
      });
      await this.finish(
        aiTurnId,
        sent.status === 'failed' ? 'FAILED' : 'REPLIED',
        {
          messageId: sent.messageId ?? null,
          skipReason: 'outside-hours',
          latencyMs: Math.round(performance.now() - startedAt),
        },
      );
      await this.recordOutcome(conversationId, sent.status !== 'failed');
      if (sent.status === 'sent' && check.agent.escalateOnFallback)
        await this.pauseForHandoff(
          conversationId,
          check.agent,
          aiTurnId,
          sent.messageId ?? null,
          'خارج ساعات العمل — حُوّلت المحادثة إلى موظف',
        );
      return;
    }

    try {
      const [{ messages, injectionSuspected, customerAsked }, contact] =
        await Promise.all([
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
      // dataCollectionFields is a Json column, so a row written before the DTO
      // existed — or edited directly — can hold anything. Coercing with String()
      // would put a literal "[object Object]" into the prompt, so malformed
      // entries are dropped instead of described to the model.
      const collectionFields = Array.isArray(agent.dataCollectionFields)
        ? agent.dataCollectionFields.flatMap((entry) => {
            if (
              typeof entry !== 'object' ||
              entry === null ||
              Array.isArray(entry)
            )
              return [];
            const { key, label } = entry as Record<string, unknown>;
            if (typeof key !== 'string' || !key.trim()) return [];
            return [
              {
                key,
                label: typeof label === 'string' && label.trim() ? label : key,
              },
            ];
          })
        : [];
      const result = await this.orchestrator.run({
        system: buildSystemPrompt(agent, contact),
        history: messages,
        context: {
          organizationId: check.organizationId,
          conversationId,
          agentId: agent.id,
          serviceAccountId: agent.serviceAccountId,
          aiTurnId,
          customerId: check.customerId,
          contactId: check.contactId,
          knowledgeBaseIds: check.knowledgeBaseIds,
          retrievalTopK: agent.retrievalTopK,
          retrievalMinScore: agent.retrievalMinScore,
          allowedCrmFields: agent.allowedCrmFields,
          collectionFields,
          routingCategories: agent.ticketRoutingRules.map((rule) => ({
            category: rule.category,
            label: rule.categoryLabel,
          })),
          routingMinConfidence: agent.routingMinConfidence,
        },
        maxTokens: Math.ceil(agent.maxResponseChars / 2),
        temperature: agent.temperature,
        fallbackMessage: agent.fallbackMessage,
        handoffMessage: agent.handoffMessage,
        maxToolCalls: agent.maxToolCallsPerTurn,
        customerAsked,
        allowedToolNames: agent.allowedTools,
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

      if (sent.status === 'suppressed') {
        this.logger.log({
          conversationId,
          aiTurnId,
          message: 'turn fenced out; a human or a newer message won the race',
        });
        await this.followUpFencedTurn(conversationId, aiTurnId);
      } else if (sent.status === 'sent' && result.handoffRequested) {
        await this.pauseForHandoff(
          conversationId,
          agent,
          aiTurnId,
          sent.messageId ?? null,
          'طلب العميل تحويل المحادثة إلى موظف',
        );
      } else if (sent.status === 'sent' && result.escalated) {
        await this.pauseForEscalation(
          conversationId,
          agent,
          aiTurnId,
          sent.messageId ?? null,
        );
      } else if (
        sent.status === 'sent' &&
        result.usedFallback &&
        agent.escalateOnFallback
      ) {
        // The fallback admits the KB could not answer. Leaving mode AUTO would
        // have the same admission — and the same promise to fetch a human —
        // repeated on every following message, so the handoff must actually
        // hand off: pause with no auto-resume, exactly like an escalation.
        await this.pauseForHandoff(
          conversationId,
          agent,
          aiTurnId,
          sent.messageId ?? null,
          'لم يعرف المساعد الإجابة فحوّل المحادثة إلى موظف',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts?.attempts ?? 1);
      if (isFinalAttempt) {
        await this.finish(aiTurnId, 'FAILED', {
          errorMessage: message.slice(0, 500),
          latencyMs: Math.round(performance.now() - startedAt),
        });
        // Count the conversation's failure budget once per exhausted turn, not
        // per BullMQ attempt — three retries of one turn are one bad turn.
        await this.recordOutcome(conversationId, false);
      } else {
        // Keep the turn RUNNING (BullMQ will retry); just keep the last error
        // visible so a stuck turn can be diagnosed from Postgres alone.
        await this.db.aiTurn.update({
          where: { id: aiTurnId },
          data: { errorMessage: message.slice(0, 500) },
        });
      }
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
    await this.recordOutcome(conversationId, sent.status !== 'failed');
    if (sent.status === 'suppressed')
      await this.followUpFencedTurn(conversationId, turn.id);
  }

  /**
   * Pausing happens AFTER the reply is committed and dispatched: mid-turn it
   * would trip the fencing guard and suppress the very message that explains
   * the handoff. No auto-resume — a human must take it from here.
   */
  private async pauseForHandoff(
    conversationId: string,
    agent: { serviceAccountId: string; name: string },
    aiTurnId: string,
    messageId: string | null,
    label: string,
  ): Promise<void> {
    await this.db.conversationAiState.updateMany({
      where: { conversationId, mode: 'AUTO' },
      data: {
        mode: 'PAUSED',
        pausedReason: 'HANDOFF',
        pausedAt: new Date(),
        resumeAt: null,
        turnSeq: { increment: 1 },
        version: { increment: 1 },
      },
    });
    await this.db.inboxSystemEvent.create({
      data: {
        conversationId,
        type: 'ai.handoff',
        label,
        actorId: agent.serviceAccountId,
        actorName: agent.name,
        payload: { aiTurnId, messageId },
      },
    });
  }

  private async pauseForEscalation(
    conversationId: string,
    agent: { serviceAccountId: string; name: string },
    aiTurnId: string,
    messageId: string | null,
  ): Promise<void> {
    await this.db.conversationAiState.updateMany({
      where: { conversationId, mode: 'AUTO' },
      data: {
        mode: 'PAUSED',
        pausedReason: 'ESCALATED',
        pausedAt: new Date(),
        resumeAt: null,
        turnSeq: { increment: 1 },
        version: { increment: 1 },
      },
    });
    await this.db.inboxSystemEvent.create({
      data: {
        conversationId,
        type: 'ai.ticket.created',
        label: 'أنشأ المساعد تذكرة وحوّل المحادثة إلى موظف',
        actorId: agent.serviceAccountId,
        actorName: agent.name,
        payload: { aiTurnId, messageId },
      },
    });
  }

  /**
   * A human pausing the conversation must not re-trigger the AI. A newer
   * inbound message leaving mode AUTO means its own enqueue no-opped against
   * the still-active job, so the follow-up is how it ever gets answered.
   */
  private async followUpFencedTurn(
    conversationId: string,
    fencedTurnId: string,
  ): Promise<void> {
    const state = await this.db.conversationAiState.findUnique({
      where: { conversationId },
      select: { mode: true },
    });
    if (state?.mode === 'AUTO')
      await this.enqueue.enqueueFollowUp(conversationId, fencedTurnId);
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
