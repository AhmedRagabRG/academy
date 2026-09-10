import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Write budgets, enforced from the AI's own audit table. A SUCCESS execution
 * is the only thing that counts: refused calls are the model trying, not the
 * AI acting. Postgres is the ledger — Redis never holds business state.
 */
@Injectable()
export class ToolBudgetService {
  constructor(private readonly db: PrismaService) {}

  /** Successful executions of one tool within this turn. */
  async perTurn(aiTurnId: string, toolName: string): Promise<number> {
    return this.db.aiToolExecution.count({
      where: { aiTurnId, toolName, outcome: 'SUCCESS' },
    });
  }

  /** Successful executions of one tool for this conversation in the last 24h. */
  async perConversationPerDay(
    conversationId: string,
    toolName: string,
  ): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.db.aiToolExecution.count({
      where: {
        toolName,
        outcome: 'SUCCESS',
        createdAt: { gte: since },
        aiTurn: { conversationId },
      },
    });
  }
}
