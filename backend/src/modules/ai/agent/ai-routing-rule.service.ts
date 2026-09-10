import { Injectable } from '@nestjs/common';
import { DomainException, NotFoundException } from '../../../core/exceptions';
import { PrismaService } from '../../../database/prisma.service';
import type {
  CreateAiRoutingRuleDto,
  UpdateAiRoutingRuleDto,
} from './dto/ai-routing-rule.dto';

/**
 * The routing table doubles as the closed category enum the model may pick
 * from in the create_ticket tool, so a rule is config-with-behaviour, not a
 * free-text note. category is unique per agent; teamId is validated against
 * the organization's own active teams (the column itself is an unvalidated
 * uuid by schema — same as Ticket.teamId).
 */
@Injectable()
export class AiRoutingRuleService {
  constructor(private readonly db: PrismaService) {}

  private async organizationId(): Promise<string> {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }

  private async assertAgent(organizationId: string, agentId: string) {
    const agent = await this.db.aiAgent.findFirst({
      where: { id: agentId, organizationId },
      select: { id: true },
    });
    if (!agent) throw new NotFoundException();
  }

  private project(rule: {
    id: string;
    agentId: string;
    category: string;
    categoryLabel: string;
    teamId: string | null;
    teamName: string | null;
    priority: string;
    active: boolean;
    displayOrder: number;
  }) {
    return {
      id: rule.id,
      agentId: rule.agentId,
      category: rule.category,
      categoryLabel: rule.categoryLabel,
      teamId: rule.teamId,
      teamName: rule.teamName,
      priority: rule.priority.toLowerCase(),
      active: rule.active,
      displayOrder: rule.displayOrder,
    };
  }

  async list(agentId: string) {
    const organizationId = await this.organizationId();
    await this.assertAgent(organizationId, agentId);
    const rules = await this.db.aiTicketRoutingRule.findMany({
      where: { agentId, organizationId },
      orderBy: [{ displayOrder: 'asc' }, { categoryLabel: 'asc' }],
    });
    const teams = await this.teamNames(organizationId);
    return rules.map((rule) =>
      this.project({
        ...rule,
        teamName: rule.teamId ? (teams.get(rule.teamId) ?? null) : null,
      }),
    );
  }

  async create(agentId: string, dto: CreateAiRoutingRuleDto) {
    const organizationId = await this.organizationId();
    await this.assertAgent(organizationId, agentId);
    await this.assertTeam(organizationId, dto.teamId);
    try {
      const rule = await this.db.aiTicketRoutingRule.create({
        data: {
          organizationId,
          agentId,
          category: dto.category,
          categoryLabel: dto.categoryLabel,
          teamId: dto.teamId ?? null,
          priority: this.priority(dto.priority),
          active: dto.active ?? true,
          displayOrder: dto.displayOrder ?? 0,
        },
      });
      return this.project({
        ...rule,
        teamName: await this.teamName(organizationId, rule.teamId),
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new DomainException(
          'routing-category-duplicate',
          `التصنيف "${dto.category}" مسجل مسبقًا لهذا المساعد`,
          409,
        );
      throw error;
    }
  }

  async update(agentId: string, ruleId: string, dto: UpdateAiRoutingRuleDto) {
    const organizationId = await this.organizationId();
    await this.assertAgent(organizationId, agentId);
    const existing = await this.db.aiTicketRoutingRule.findFirst({
      where: { id: ruleId, agentId, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException();
    if (dto.teamId !== undefined)
      await this.assertTeam(organizationId, dto.teamId);
    const rule = await this.db.aiTicketRoutingRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.categoryLabel !== undefined
          ? { categoryLabel: dto.categoryLabel }
          : {}),
        ...(dto.teamId !== undefined ? { teamId: dto.teamId ?? null } : {}),
        ...(dto.priority !== undefined
          ? { priority: this.priority(dto.priority) }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.displayOrder !== undefined
          ? { displayOrder: dto.displayOrder }
          : {}),
      },
    });
    return this.project({
      ...rule,
      teamName: await this.teamName(organizationId, rule.teamId),
    });
  }

  async remove(agentId: string, ruleId: string): Promise<void> {
    const organizationId = await this.organizationId();
    await this.assertAgent(organizationId, agentId);
    const existing = await this.db.aiTicketRoutingRule.findFirst({
      where: { id: ruleId, agentId, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException();
    await this.db.aiTicketRoutingRule.delete({ where: { id: ruleId } });
  }

  private priority(value?: string) {
    return (value?.toUpperCase() ?? 'MEDIUM') as
      'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }

  private async assertTeam(
    organizationId: string,
    teamId: string | null | undefined,
  ) {
    if (!teamId) return;
    const team = await this.db.ticketTeam.findFirst({
      where: { id: teamId, organizationId, active: true },
      select: { id: true },
    });
    if (!team)
      throw new DomainException(
        'team-unknown',
        'الفريق غير موجود أو غير نشط',
        422,
      );
  }

  private async teamNames(
    organizationId: string,
  ): Promise<Map<string, string>> {
    const teams = await this.db.ticketTeam.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    return new Map(teams.map((team) => [team.id, team.name]));
  }

  private async teamName(
    organizationId: string,
    teamId: string | null,
  ): Promise<string | null> {
    if (!teamId) return null;
    return (await this.teamNames(organizationId)).get(teamId) ?? null;
  }
}

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: string }).code === 'P2002';
