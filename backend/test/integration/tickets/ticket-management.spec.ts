import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../../prisma/generated/client';
import { TicketPolicy } from '../../../src/modules/tickets/ticket.policy';
import { TicketRepository } from '../../../src/modules/tickets/ticket.repository';
import { TicketService } from '../../../src/modules/tickets/ticket.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';
import type { StorageService } from '../../../src/storage/storage.service.interface';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const policy = new TicketPolicy();
const repository = new TicketRepository(prisma as never, policy);
const storage: StorageService = {
  store: jest.fn(),
  retrieve: jest.fn(),
  remove: jest.fn(),
  publicUrl: jest.fn(),
};
const config = {
  getOrThrow: () => 10 * 1024 * 1024,
} as unknown as ConfigService;
const service = new TicketService(repository, policy, storage, config);
const createdTicketIds: string[] = [];
let organizationId: string;
let actorId: string;
let secondActorId: string;
let teamId: string;
const SECOND_ACTOR_ID = '00000000-0000-4000-8000-000000000990';
const SECOND_ACTOR_EMAIL = 'ticket-integration-second@test.invalid';
let ownsSecondActor = false;

const allPermissions = [
  'tickets.view.all',
  'tickets.create',
  'tickets.edit',
  'tickets.change.status',
  'tickets.change.priority',
  'tickets.assign.team',
  'tickets.assign.employee',
  'tickets.reassign',
  'tickets.comment',
  'tickets.attach.files',
  'tickets.archive',
  'tickets.restore',
  'tickets.delete',
];
const caller = (
  accountId = actorId,
  permissions = allPermissions,
): CallerContext => ({
  accountId,
  displayName: `actor-${accountId}`,
  email: `${accountId}@test.invalid`,
  sessionId: 'ticket-integration',
  roles: [],
  permissionKeys: permissions,
  organizationWide: true,
  authenticatedAt: new Date(0).toISOString(),
});

describe('ticket management database contract', () => {
  beforeAll(async () => {
    const organization = await prisma.organization.findFirstOrThrow();
    organizationId = organization.id;
    const primaryAccount = await prisma.account.findFirstOrThrow({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    actorId = primaryAccount.id;
    await prisma.accountRole.deleteMany({
      where: { accountId: SECOND_ACTOR_ID },
    });
    await prisma.refreshToken.deleteMany({
      where: { accountId: SECOND_ACTOR_ID },
    });
    await prisma.account.deleteMany({
      where: {
        OR: [{ id: SECOND_ACTOR_ID }, { email: SECOND_ACTOR_EMAIL }],
      },
    });
    const secondAccount = await prisma.account.create({
      data: {
        id: SECOND_ACTOR_ID,
        email: SECOND_ACTOR_EMAIL,
        passwordHash: 'ticket-integration-not-authenticatable',
        displayName: 'Ticket Integration Second Actor',
        normalizedDisplayName: 'ticket integration second actor fixture',
        organizationWide: true,
        status: 'ACTIVE',
      },
    });
    secondActorId = secondAccount.id;
    ownsSecondActor = true;
    expect(secondActorId).not.toBe(actorId);
    const team = await prisma.ticketTeam.create({
      data: { organizationId, name: `ticket-test-${Date.now()}` },
    });
    teamId = team.id;
    await prisma.ticketTeamMembership.createMany({
      data: [
        { teamId, employeeId: actorId },
        { teamId, employeeId: secondActorId },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.ticketAttachment.deleteMany({
      where: { ticketId: { in: createdTicketIds } },
    });
    await prisma.ticketComment.deleteMany({
      where: { ticketId: { in: createdTicketIds } },
    });
    await prisma.ticketActivity.deleteMany({
      where: { ticketId: { in: createdTicketIds } },
    });
    await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    await prisma.ticketTeamMembership.deleteMany({ where: { teamId } });
    await prisma.ticketTeam.deleteMany({ where: { id: teamId } });
    if (ownsSecondActor) {
      await prisma.accountRole.deleteMany({
        where: { accountId: SECOND_ACTOR_ID },
      });
      await prisma.refreshToken.deleteMany({
        where: { accountId: SECOND_ACTOR_ID },
      });
      await prisma.account.deleteMany({
        where: { id: SECOND_ACTOR_ID, email: SECOND_ACTOR_EMAIL },
      });
    }
    await prisma.$disconnect();
  });

  async function create(title: string) {
    const ticket = await service.create(caller(), {
      title,
      description: 'تفاصيل اختبار تكامل التذاكر',
      status: 'backlog',
      priority: 'medium',
      teamId,
      employeeId: actorId,
      tags: ['integration'],
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  it('persists lifecycle commands with one version and one activity each', async () => {
    let ticket = await create('تدفق إنشاء وتحديث متكامل');
    ticket = await service.status(caller(), ticket.id, 'todo', ticket.version);
    ticket = await service.priority(
      caller(),
      ticket.id,
      'critical',
      ticket.version,
    );
    ticket = await service.assignment(caller(), ticket.id, {
      teamId,
      employeeId: secondActorId,
      expectedVersion: ticket.version,
    });
    ticket = await service.addComment(caller(), ticket.id, 'تعليق تكامل');
    ticket = await service.archive(caller(), ticket.id, ticket.version);
    ticket = await service.restore(caller(), ticket.id, ticket.version);
    expect(ticket.status).toBe('todo');
    expect(ticket.version).toBe(7);
    expect(
      await prisma.ticketActivity.count({ where: { ticketId: ticket.id } }),
    ).toBe(7);
  });

  it('rolls back stale and denied commands without activity', async () => {
    const ticket = await create('اختبار التراجع الذري');
    const before = await prisma.ticketActivity.count({
      where: { ticketId: ticket.id },
    });
    await expect(
      service.status(caller(), ticket.id, 'review', ticket.version - 1),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(
      service.priority(
        caller(actorId, ['tickets.view.all']),
        ticket.id,
        'high',
        ticket.version,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(
      await prisma.ticketActivity.count({ where: { ticketId: ticket.id } }),
    ).toBe(before);
    expect(
      (await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } }))
        .version,
    ).toBe(ticket.version);
  });

  it('enforces comment ownership and preserves the owner comment', async () => {
    const ticket = await create('اختبار ملكية التعليق');
    await service.addComment(caller(), ticket.id, 'تعليق المالك');
    const comment = await prisma.ticketComment.findFirstOrThrow({
      where: { ticketId: ticket.id },
    });
    const before = await prisma.ticketActivity.count({
      where: { ticketId: ticket.id },
    });
    await expect(
      service.editComment(
        caller(secondActorId),
        ticket.id,
        comment.id,
        'تعديل مرفوض',
      ),
    ).rejects.toMatchObject({ code: 'forbidden' });
    expect(
      (
        await prisma.ticketComment.findUniqueOrThrow({
          where: { id: comment.id },
        })
      ).message,
    ).toBe('تعليق المالك');
    expect(
      await prisma.ticketActivity.count({ where: { ticketId: ticket.id } }),
    ).toBe(before);
  });

  it.each(['newest', 'oldest', 'priority', 'updated'] as const)(
    'uses bound query cursors for %s sorting',
    async (sort) => {
      await create(`cursor-${sort}-1`);
      await create(`cursor-${sort}-2`);
      const first = await service.list(caller(), {
        mode: 'active',
        sort,
        pageSize: 1,
      });
      const second = await service.list(caller(), {
        mode: 'active',
        sort,
        pageSize: 1,
        cursor: first.nextCursor,
      });
      expect(second.items.map(({ id }) => id)).not.toContain(first.items[0].id);
      await expect(
        service.list(caller(), {
          mode: 'active',
          sort,
          search: 'different',
          pageSize: 1,
          cursor: first.nextCursor,
        }),
      ).rejects.toMatchObject({ code: 'cursor-query-mismatch' });
    },
  );

  it('keeps dashboard counts equal to equivalent scoped lists', async () => {
    const dashboard = await service.dashboard(caller());
    const open = await service.list(caller(), {
      mode: 'active',
      status: ['backlog', 'todo', 'in-progress', 'waiting', 'review'],
      pageSize: 100,
      sort: 'updated',
    });
    const waiting = await service.list(caller(), {
      mode: 'active',
      status: ['waiting'],
      pageSize: 100,
      sort: 'updated',
    });
    expect(dashboard.open).toBe(open.total);
    expect(dashboard.waiting).toBe(waiting.total);
  });
});
