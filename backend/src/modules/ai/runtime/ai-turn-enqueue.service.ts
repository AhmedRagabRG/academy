import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../../database/prisma.service';
import { AI_TURN_QUEUE } from '../../../queue/queue.constants';
import type { AiTurnJob } from './ai-turn.processor';

/** Collapses a burst of rapid customer messages into one turn. */
const DEBOUNCE_MS = 4000;

@Injectable()
export class AiTurnEnqueueService {
  private readonly logger = new Logger(AiTurnEnqueueService.name);

  constructor(
    private readonly db: PrismaService,
    @Optional()
    @InjectQueue(AI_TURN_QUEUE)
    private readonly queue?: Queue<AiTurnJob>,
  ) {}

  /**
   * Called after the webhook transaction commits. The AiTurn row is minted in
   * Postgres first so the aiTurnId — and therefore the retryToken every BullMQ
   * attempt will use — exists durably before any job does.
   *
   * A failure here must never fail the webhook: Meta would redeliver, and the
   * message is already safely persisted. No AI is strictly better than a lost
   * message, so this swallows and logs.
   */
  async enqueue(conversationId: string): Promise<void> {
    if (!this.queue) return;
    try {
      await this.mintAndAdd(
        conversationId,
        `ai-${conversationId}`,
        DEBOUNCE_MS,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue AI turn for ${conversationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Re-drives the conversation after a turn was fenced out by a newer inbound
   * message (not by a human — the caller checks mode). The burst-debounce id
   * is still occupied by the job that is being suppressed, and BullMQ silently
   * no-ops add() for an existing id, so the follow-up needs its own id. It is
   * unique per fenced turn, runs the same eligibility gate, and completes into
   * removal — so it cannot accumulate.
   */
  async enqueueFollowUp(conversationId: string, fencedTurnId: string) {
    if (!this.queue) return;
    try {
      await this.mintAndAdd(
        conversationId,
        `ai-${conversationId}-after-${fencedTurnId}`,
        DEBOUNCE_MS,
      );
    } catch (error) {
      this.logger.error(
        `Failed to re-enqueue AI turn for ${conversationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async mintAndAdd(
    conversationId: string,
    jobId: string,
    delayMs: number,
  ): Promise<void> {
    const state = await this.db.conversationAiState.findUnique({
      where: { conversationId },
      select: {
        agentId: true,
        turnSeq: true,
        mode: true,
        organizationId: true,
      },
    });
    if (!state || state.mode === 'OFF') return;

    const turn = await this.db.aiTurn.create({
      data: {
        organizationId: state.organizationId,
        conversationId,
        agentId: state.agentId,
        turnSeqAtStart: state.turnSeq,
        status: 'QUEUED',
      },
      select: { id: true },
    });

    // One job per conversation for the debounce id: BullMQ no-ops add() while
    // a job with that id still exists, which is exactly the collapse we want
    // for a burst. The id must therefore be freed on completion — and it can
    // contain no ':' (BullMQ 6 rejects custom ids with it).
    await this.queue!.add(
      'turn',
      { conversationId, aiTurnId: turn.id },
      {
        jobId,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
}
