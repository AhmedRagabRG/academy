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
      const state = await this.db.conversationAiState.findUnique({
        where: { conversationId },
        select: { agentId: true, turnSeq: true, mode: true, organizationId: true },
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

      // One job per conversation. BullMQ no-ops add() for an existing id, which
      // is exactly the debounce we want for a burst; the processor re-checks
      // state at run time so a collapsed job still sees the newest messages.
      await this.queue.add(
        'turn',
        { conversationId, aiTurnId: turn.id },
        {
          jobId: `ai:${conversationId}`,
          delay: DEBOUNCE_MS,
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue AI turn for ${conversationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
