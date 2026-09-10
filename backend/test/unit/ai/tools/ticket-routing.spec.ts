import { TicketRoutingService } from '../../../../src/modules/ai/tools/ticket-routing.service';
import type { PrismaService } from '../../../../src/database/prisma.service';

const db = (options: {
  rule?: Record<string, unknown> | null;
  team?: { id: string } | null;
}) =>
  ({
    aiTicketRoutingRule: {
      findUnique: jest.fn().mockResolvedValue(options.rule ?? null),
    },
    ticketTeam: {
      findFirst: jest.fn().mockResolvedValue(options.team ?? null),
    },
  }) as unknown as PrismaService;

const input = {
  organizationId: 'org-1',
  agentId: 'agent-1',
  category: 'complaint',
  confidence: 0.9,
  routingMinConfidence: 0.6,
};

describe('TicketRoutingService', () => {
  it('assigns the rule team when the rule matches and confidence is high', async () => {
    const service = new TicketRoutingService(
      db({
        rule: { active: true, teamId: 'team-1', priority: 'HIGH' },
        team: { id: 'team-1' },
      }),
    );
    const decision = await service.resolve(input);
    expect(decision).toEqual({
      teamId: 'team-1',
      priority: 'high',
      tags: ['ai-created'],
      routingNote: null,
    });
  });

  it('creates unassigned with the uncertain tag when no rule matches', async () => {
    const service = new TicketRoutingService(db({}));
    const decision = await service.resolve(input);
    expect(decision.teamId).toBeNull();
    expect(decision.tags).toContain('ai-routing-uncertain');
    expect(decision.priority).toBe('medium');
  });

  it('creates unassigned when the rule is inactive', async () => {
    const service = new TicketRoutingService(
      db({ rule: { active: false, teamId: 'team-1', priority: 'HIGH' } }),
    );
    const decision = await service.resolve(input);
    expect(decision.teamId).toBeNull();
    expect(decision.tags).toContain('ai-routing-uncertain');
  });

  it('creates unassigned when the rule team is not active', async () => {
    const service = new TicketRoutingService(
      db({
        rule: { active: true, teamId: 'team-1', priority: 'HIGH' },
        team: null,
      }),
    );
    const decision = await service.resolve(input);
    expect(decision.teamId).toBeNull();
    expect(decision.tags).toContain('ai-routing-uncertain');
    expect(decision.routingNote).toContain('غير نشط');
  });

  it('creates unassigned when confidence is below the floor', async () => {
    const service = new TicketRoutingService(
      db({
        rule: { active: true, teamId: 'team-1', priority: 'HIGH' },
        team: { id: 'team-1' },
      }),
    );
    const decision = await service.resolve({ ...input, confidence: 0.4 });
    expect(decision.teamId).toBeNull();
    expect(decision.tags).toContain('ai-routing-uncertain');
    expect(decision.routingNote).toContain('0.40');
  });

  it('treats a rule with no team as valid and unassigned', async () => {
    const service = new TicketRoutingService(
      db({ rule: { active: true, teamId: null, priority: 'LOW' } }),
    );
    const decision = await service.resolve(input);
    expect(decision.teamId).toBeNull();
    expect(decision.tags).not.toContain('ai-routing-uncertain');
    expect(decision.priority).toBe('low');
  });
});
