import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface RoutingDecision {
  /** Resolved team, or null when deliberately left unassigned. */
  teamId: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  /** Human-readable explanation recorded on the ticket when routing declined. */
  routingNote: string | null;
}

/**
 * The model never supplies a teamId — it picks a semantic category from the
 * agent's active routing rules plus a self-reported confidence, and this
 * resolver decides deterministically. Below the confidence floor, or with no
 * matching rule, the ticket is created UNASSIGNED and tagged
 * `ai-routing-uncertain`: the failure mode is a ticket in the backlog, which
 * is exactly how a human-created unassigned ticket behaves today.
 * employeeId is never set here — employee assignment stays human-only.
 */
@Injectable()
export class TicketRoutingService {
  constructor(private readonly db: PrismaService) {}

  async resolve(input: {
    organizationId: string;
    agentId: string;
    category: string;
    confidence: number;
    routingMinConfidence: number;
  }): Promise<RoutingDecision> {
    const rule = await this.db.aiTicketRoutingRule.findUnique({
      where: {
        agentId_category: {
          agentId: input.agentId,
          category: input.category,
        },
      },
      select: { active: true, teamId: true, priority: true },
    });
    // The rule's teamId is an unvalidated uuid by schema, so the team's
    // liveness is checked here before it is ever written onto a ticket.
    const team =
      rule?.teamId !== null && rule?.teamId !== undefined
        ? await this.db.ticketTeam.findFirst({
            where: {
              id: rule.teamId,
              organizationId: input.organizationId,
              active: true,
            },
            select: { id: true },
          })
        : null;

    const baseTags = ['ai-created'];
    if (!rule || !rule.active)
      return {
        teamId: null,
        priority: 'medium',
        tags: [...baseTags, 'ai-routing-uncertain'],
        routingNote: `لا توجد قاعدة توجيه نشطة للتصنيف "${input.category}" — تُرك التذكرة بدون إسناد.`,
      };

    const priority = rule.priority.toLowerCase() as RoutingDecision['priority'];
    if (rule.teamId && !team)
      return {
        teamId: null,
        priority,
        tags: [...baseTags, 'ai-routing-uncertain'],
        routingNote: `فريق التصنيف "${input.category}" غير نشط — تُرك التذكرة بدون إسناد.`,
      };

    if (input.confidence < input.routingMinConfidence)
      return {
        teamId: null,
        priority,
        tags: [...baseTags, 'ai-routing-uncertain'],
        routingNote: `ثقة النموذج (${input.confidence.toFixed(2)}) أقل من الحد المسموح (${input.routingMinConfidence.toFixed(2)}) — تُرك التذكرة بدون إسناد.`,
      };

    return {
      teamId: rule.teamId,
      priority,
      tags: baseTags,
      routingNote: null,
    };
  }
}
