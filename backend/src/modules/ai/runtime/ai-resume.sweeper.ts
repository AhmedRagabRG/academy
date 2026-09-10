import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { InboxRealtimeService } from '../../inbox/inbox-realtime.service';

const errorMessageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface ResumedConversation {
  conversationId: string;
}

@Injectable()
export class AiResumeSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiResumeSweeper.name);
  private timer?: NodeJS.Timeout;
  private ticking = false;

  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
    private readonly realtime: InboxRealtimeService,
  ) {}

  private get enabled(): boolean {
    return this.config.get<boolean>('ai.resumeSweepEnabled') !== false;
  }

  private get intervalMs(): number {
    return this.config.get<number>('ai.resumeSweepMs') ?? 30000;
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('AI resume sweeper disabled by configuration');
      return;
    }
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    // Never hold the process open for the sake of the poll loop.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One pass of the loop. Public so a test can drive it without waiting. */
  async tick(): Promise<void> {
    if (!this.enabled || this.ticking) return;
    this.ticking = true;
    let resumedCount = 0;
    try {
      await this.db.$transaction(async (tx) => {
        /*
         * Postgres is the durable clock and source of truth. A BullMQ delayed
         * job would put durable business state in Redis, where a flush or
         * failover could silently lose every pending resume and leave pauses
         * permanent with no process able to detect them.
         *
         * ESCALATED, HANDOFF, and ERROR_BUDGET intentionally never resume:
         * they set resumeAt to null, while the reason filter below is an
         * additional belt-and-braces guard against malformed legacy rows.
         */
        const resumed = await tx.$queryRaw<ResumedConversation[]>`
          UPDATE "ConversationAiState"
          SET mode='AUTO', "pausedReason"=NULL, "pausedAt"=NULL, "resumeAt"=NULL,
              "turnSeq"="turnSeq"+1, "version"="version"+1, "updatedAt"=now()
          WHERE mode='PAUSED' AND "resumeAt" IS NOT NULL AND "resumeAt" <= now()
            AND "pausedReason" IN ('HUMAN_REPLY','MANUAL')
          RETURNING "conversationId"
        `;
        if (!resumed.length) return;
        resumedCount = resumed.length;

        const states = await tx.conversationAiState.findMany({
          where: {
            conversationId: {
              in: resumed.map(({ conversationId }) => conversationId),
            },
          },
          select: { conversationId: true, agentId: true },
        });
        const agents = await tx.aiAgent.findMany({
          where: { id: { in: states.map(({ agentId }) => agentId) } },
          select: { id: true, name: true, serviceAccountId: true },
        });
        const agentById = new Map(agents.map((agent) => [agent.id, agent]));
        const stateByConversation = new Map(
          states.map((state) => [state.conversationId, state]),
        );

        await tx.inboxSystemEvent.createMany({
          data: resumed.map(({ conversationId }) => {
            const state = stateByConversation.get(conversationId);
            const agent = state ? agentById.get(state.agentId) : undefined;
            if (!agent)
              throw new Error(
                `AI agent missing for resumed conversation ${conversationId}`,
              );
            return {
              conversationId,
              type: 'ai.resumed',
              label: 'استؤنف المساعد الذكي',
              actorId: agent.serviceAccountId,
              actorName: agent.name,
            };
          }),
        });
      });
    } catch (error) {
      this.logger.error(
        `AI resume sweep tick failed: ${errorMessageOf(error)}`,
      );
    } finally {
      this.ticking = false;
    }
    // Only after the transaction committed: agents watching the inbox need the
    // conversation's AI badge to stop saying "paused" without a manual refresh.
    if (resumedCount) this.realtime.publish();
  }
}
