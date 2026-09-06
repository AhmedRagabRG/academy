import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../../prisma/generated/client';
import type { InboxDeliveryPort } from '../../../src/modules/inbox/delivery/inbox-delivery.port';
import { InboxListDto } from '../../../src/modules/inbox/dto/inbox.dto';
import { InboxPolicy } from '../../../src/modules/inbox/inbox.policy';
import { InboxRepository } from '../../../src/modules/inbox/inbox.repository';
import { InboxService } from '../../../src/modules/inbox/inbox.service';
import type { InboxCrmLinkService } from '../../../src/modules/inbox/crm/inbox-crm-link.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';
import type { StorageService } from '../../../src/storage/storage.service.interface';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const policy = new InboxPolicy();
const repository = new InboxRepository(prisma as never, policy);
const delivery: InboxDeliveryPort = {
  enqueue: jest.fn((request) =>
    Promise.resolve({
      state: 'queued',
      providerReference: `local:${request.messageId}`,
    }),
  ),
  markRead: jest.fn(() => Promise.resolve()),
};
const crm = {
  link: jest.fn(() => Promise.resolve()),
  summary: jest.fn(() => Promise.resolve(null)),
} as unknown as InboxCrmLinkService;
const storage: StorageService = {
  store: jest.fn((file) =>
    Promise.resolve({
      id: randomUUID(),
      fileName: `${randomUUID()}.pdf`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: 'ignored',
    }),
  ),
  retrieve: jest.fn(),
  remove: jest.fn(() => Promise.resolve()),
  publicUrl: jest.fn(),
};
const service = new InboxService(repository, policy, delivery, storage, crm);

const permissions = [
  'inbox.view.all',
  'inbox.assign.employee',
  'inbox.assign.team',
  'inbox.reassign',
  'inbox.reply',
  'inbox.change.status',
  'inbox.manage.tags',
  'inbox.manage.notes',
  'inbox.archive',
  'inbox.delete',
  'inbox.restore',
];
let organizationId: string;
let branchA: string;
let branchB: string;
let actorId: string;
let otherId: string;
let teamA: string;
let teamB: string;
let platformId: string;
let tagId: string;
const ownedAccountIds: string[] = [];
const ownedTeamIds: string[] = [];
const ownedCustomerIds: string[] = [];
const ownedConversationIds: string[] = [];
const ownedStagedAttachmentIds: string[] = [];
const ownedOrganizationIds: string[] = [];
let ownsBranchB = false;
const FALLBACK_BRANCH_ID = '10000000-0000-4000-8000-000000009901';
const FALLBACK_BRANCH_CODE = 'INBOX-TEST-SECOND';

const caller = (
  permissionKeys = permissions,
  overrides: Partial<CallerContext> = {},
): CallerContext => ({
  accountId: actorId,
  displayName: 'Inbox Actor',
  email: 'inbox@test.invalid',
  sessionId: 'inbox-integration',
  roles: [],
  permissionKeys,
  authorizedBranchIds: [branchA],
  organizationWide: false,
  authenticatedAt: new Date(0).toISOString(),
  ...overrides,
});
const query = (values: Partial<InboxListDto> = {}) =>
  Object.assign(new InboxListDto(), values);
const createConversation = async (values: {
  branchId?: string;
  employeeId?: string | null;
  teamId?: string | null;
  status?: 'OPEN' | 'PENDING' | 'SNOOZED' | 'CLOSED' | 'ARCHIVED';
  unread?: number;
  activity?: Date;
  name?: string;
  lastMessage?: string;
}) => {
  const customer = await prisma.inboxCustomer.create({
    data: {
      organizationId,
      branchId: values.branchId ?? branchA,
      name: values.name ?? `Customer ${randomUUID()}`,
      normalizedName: (values.name ?? 'customer').toLowerCase(),
      phone: `+20${Math.floor(Math.random() * 1_000_000_000)}`,
      normalizedPhone: randomUUID(),
      firstContactAt: new Date('2026-01-01'),
      lastActivityAt: values.activity ?? new Date(),
    },
  });
  ownedCustomerIds.push(customer.id);
  const conversation = await prisma.inboxConversation.create({
    data: {
      organizationId,
      customerId: customer.id,
      platformId,
      status: values.status ?? 'OPEN',
      assignedEmployeeId: values.employeeId ?? null,
      assignedTeamId: values.teamId ?? null,
      unreadCount: values.unread ?? 0,
      lastMessage: values.lastMessage ?? 'message',
      lastActivityAt: values.activity ?? new Date(),
    },
  });
  ownedConversationIds.push(conversation.id);
  return conversation;
};

describe('Inbox persisted behavioral contract', () => {
  beforeAll(async () => {
    const organization = await prisma.organization.findFirstOrThrow();
    organizationId = organization.id;
    const branches = await prisma.branch.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });
    if (branches.length < 2) {
      const existingFallback = await prisma.branch.findUnique({
        where: {
          organizationId_code: {
            organizationId,
            code: FALLBACK_BRANCH_CODE,
          },
        },
      });
      if (existingFallback) {
        branches.push(existingFallback);
      } else {
        const fallback = await prisma.branch.create({
          data: {
            id: FALLBACK_BRANCH_ID,
            organizationId,
            name: 'فرع اختبار صندوق الوارد',
            normalizedName: 'فرع اختبار صندوق الوارد',
            code: FALLBACK_BRANCH_CODE,
            address: 'عنوان اختبار معزول',
            phone: '+201000009901',
            email: 'inbox-test-branch@test.invalid',
            workingHours: 'الأحد–الخميس، 09:00–17:00',
            status: 'ACTIVE',
          },
        });
        ownsBranchB = true;
        branches.push(fallback);
      }
    }
    [branchA, branchB] = branches.map((x) => x.id);
    const actor = await prisma.account.create({
      data: {
        email: `inbox-actor-${randomUUID()}@test.invalid`,
        passwordHash: 'not-authenticatable',
        displayName: 'Inbox Actor',
        normalizedDisplayName: 'inbox actor',
        branchIds: [branchA],
        status: 'ACTIVE',
      },
    });
    ownedAccountIds.push(actor.id);
    const other = await prisma.account.create({
      data: {
        email: `inbox-other-${randomUUID()}@test.invalid`,
        passwordHash: 'not-authenticatable',
        displayName: 'Inbox Other',
        normalizedDisplayName: 'inbox other',
        branchIds: [branchA, branchB],
        status: 'ACTIVE',
      },
    });
    ownedAccountIds.push(other.id);
    actorId = actor.id;
    otherId = other.id;
    const firstTeam = await prisma.ticketTeam.create({
      data: { organizationId, name: `Inbox A ${randomUUID()}` },
    });
    ownedTeamIds.push(firstTeam.id);
    const secondTeam = await prisma.ticketTeam.create({
      data: { organizationId, name: `Inbox B ${randomUUID()}` },
    });
    ownedTeamIds.push(secondTeam.id);
    teamA = firstTeam.id;
    teamB = secondTeam.id;
    await prisma.ticketTeamMembership.createMany({
      data: [
        { teamId: teamA, employeeId: actorId },
        { teamId: teamA, employeeId: otherId },
        { teamId: teamB, employeeId: otherId },
      ],
    });
    // A non-Meta platform: these cases exercise local delivery, and the Meta
    // channels reject attachments the provider cannot carry yet.
    platformId = (
      await prisma.inboxPlatform.findFirstOrThrow({
        where: {
          organizationId,
          code: { notIn: ['whatsapp', 'messenger', 'instagram'] },
        },
        orderBy: { code: 'asc' },
      })
    ).id;
    tagId = (
      await prisma.inboxTag.findFirstOrThrow({ where: { organizationId } })
    ).id;
  });

  afterAll(async () => {
    try {
      if (ownedStagedAttachmentIds.length)
        await prisma.inboxStagedAttachment.deleteMany({
          where: { id: { in: ownedStagedAttachmentIds } },
        });
      if (ownedConversationIds.length)
        await prisma.inboxConversation.deleteMany({
          where: { id: { in: ownedConversationIds } },
        });
      if (ownedCustomerIds.length)
        await prisma.inboxCustomer.deleteMany({
          where: { id: { in: ownedCustomerIds } },
        });
      if (ownedTeamIds.length) {
        await prisma.ticketTeamMembership.deleteMany({
          where: { teamId: { in: ownedTeamIds } },
        });
        await prisma.ticketTeam.deleteMany({
          where: { id: { in: ownedTeamIds } },
        });
      }
      if (ownedAccountIds.length)
        await prisma.account.deleteMany({
          where: { id: { in: ownedAccountIds } },
        });
      if (ownsBranchB)
        await prisma.branch.deleteMany({ where: { id: FALLBACK_BRANCH_ID } });
      if (ownedOrganizationIds.length)
        await prisma.organization.deleteMany({
          where: { id: { in: ownedOrganizationIds } },
        });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('enforces visibility precedence, branch intersection, no-view, and non-disclosure', async () => {
    const assigned = await createConversation({
      employeeId: actorId,
      teamId: teamB,
    });
    const team = await createConversation({
      employeeId: otherId,
      teamId: teamA,
    });
    const otherBranch = await createConversation({
      branchId: branchB,
      employeeId: actorId,
      teamId: teamA,
    });
    const all = await service.list(
      caller(['inbox.view.all', 'inbox.view.team', 'inbox.view.assigned']),
      query({ limit: 100 }),
    );
    expect(all.items.map((x) => x.id)).toEqual(
      expect.arrayContaining([assigned.id, team.id]),
    );
    expect(all.items.map((x) => x.id)).not.toContain(otherBranch.id);
    const teamScoped = await service.list(
      caller(['inbox.view.team', 'inbox.view.assigned']),
      query({ limit: 100 }),
    );
    expect(teamScoped.items.map((x) => x.id)).toContain(team.id);
    expect(teamScoped.items.map((x) => x.id)).not.toContain(assigned.id);
    const assignedScoped = await service.list(
      caller(['inbox.view.assigned']),
      query({ limit: 100 }),
    );
    expect(assignedScoped.items.map((x) => x.id)).toContain(assigned.id);
    await expect(service.list(caller([]), query())).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      service.detail(caller(['inbox.view.all']), otherBranch.id),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('supports query-bound cursors, filters, search, and all stable sorts', async () => {
    const times = [1, 2, 3].map(
      (hour) => new Date(`2026-07-01T0${hour}:00:00Z`),
    );
    const rows = await Promise.all([
      createConversation({
        employeeId: actorId,
        teamId: teamA,
        unread: 1,
        activity: times[0],
        name: 'Needle Alpha',
        lastMessage: 'first',
      }),
      createConversation({
        employeeId: actorId,
        teamId: teamA,
        unread: 5,
        activity: times[1],
        name: 'Needle Beta',
        lastMessage: 'second',
      }),
      createConversation({
        employeeId: actorId,
        teamId: teamA,
        unread: 2,
        activity: times[2],
        name: 'Other',
        lastMessage: 'needle body',
      }),
    ]);
    await prisma.inboxConversationTag.create({
      data: { conversationId: rows[0].id, tagId, addedBy: actorId },
    });
    const filtered = await service.list(
      caller(),
      query({
        search: 'needle',
        employeeIds: [actorId],
        teamIds: [teamA],
        branchIds: [branchA],
        platforms: [platformId],
        tagIds: [tagId],
        limit: 100,
      }),
    );
    expect(filtered.items.map((x) => x.id)).toEqual([rows[0].id]);
    const latest = await service.list(
      caller(),
      query({ search: 'needle', limit: 2, sort: 'latest' }),
    );
    expect(latest.nextCursor).toBeTruthy();
    const page2 = await service.list(
      caller(),
      query({
        search: 'needle',
        limit: 2,
        sort: 'latest',
        cursor: latest.nextCursor ?? undefined,
      }),
    );
    expect(
      new Set([...latest.items, ...page2.items].map((x) => x.id)).size,
    ).toBe(latest.items.length + page2.items.length);
    await expect(
      service.list(
        caller(),
        query({
          search: 'changed',
          limit: 2,
          cursor: latest.nextCursor ?? undefined,
        }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    const oldest = await service.list(
      caller(),
      query({ search: 'needle', limit: 100, sort: 'oldest' }),
    );
    expect(oldest.items.findIndex((x) => x.id === rows[0].id)).toBeLessThan(
      oldest.items.findIndex((x) => x.id === rows[2].id),
    );
    const unread = await service.list(
      caller(),
      query({ search: 'needle', limit: 100, sort: 'unread' }),
    );
    expect(unread.items.findIndex((x) => x.id === rows[1].id)).toBeLessThan(
      unread.items.findIndex((x) => x.id === rows[0].id),
    );
  });

  it('keeps dashboard counts within the same scoped and filtered population', async () => {
    const open = await createConversation({
      employeeId: actorId,
      teamId: teamA,
      status: 'OPEN',
      unread: 2,
      lastMessage: 'dashboard-marker',
    });
    await createConversation({
      employeeId: actorId,
      teamId: teamA,
      status: 'PENDING',
      lastMessage: 'dashboard-marker',
    });
    const q = query({ search: 'dashboard-marker', limit: 100 });
    const [list, dashboard] = await Promise.all([
      service.list(caller(), q),
      service.dashboard(caller(), q),
    ]);
    expect(dashboard.open).toBe(
      list.items.filter((x) => x.status === 'open').length,
    );
    expect(dashboard.pending).toBe(
      list.items.filter((x) => x.status === 'pending').length,
    );
    expect(dashboard.unread).toBe(
      list.items.filter((x) => x.unreadCount > 0).length,
    );
    expect(list.items.map((x) => x.id)).toContain(open.id);
  });

  it('stages uploads and atomically consumes only caller-owned metadata', async () => {
    const descriptor = await service.stageAttachment(caller(), {
      originalname: 'proof.pdf',
      mimetype: 'application/pdf',
      size: 4,
      buffer: Buffer.from('%PDF'),
    });
    ownedStagedAttachmentIds.push(descriptor.id);
    expect(descriptor).toMatchObject({
      kind: 'pdf',
      fileName: 'proof.pdf',
      sizeBytes: 4,
    });
    const staged = await prisma.inboxStagedAttachment.findUniqueOrThrow({
      where: { id: descriptor.id },
    });
    expect(staged.ownerAccountId).toBe(actorId);
    expect(staged.consumedAt).toBeNull();
    const conversation = await createConversation({
      employeeId: actorId,
      teamId: teamA,
    });
    await service.sendReply(caller(), conversation.id, {
      body: '',
      attachments: [descriptor],
      retryToken: randomUUID(),
    });
    expect(
      (
        await prisma.inboxStagedAttachment.findUniqueOrThrow({
          where: { id: descriptor.id },
        })
      ).consumedAt,
    ).not.toBeNull();
    const foreign = await prisma.inboxStagedAttachment.create({
      data: {
        organizationId,
        ownerAccountId: otherId,
        kind: 'pdf',
        fileName: 'foreign.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        storageId: randomUUID(),
        storageName: `${randomUUID()}.pdf`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    ownedStagedAttachmentIds.push(foreign.id);
    const before = await prisma.inboxMessage.count({
      where: { conversationId: conversation.id },
    });
    await expect(
      service.sendReply(caller(), conversation.id, {
        body: '',
        attachments: [
          {
            id: foreign.id,
            kind: 'pdf',
            fileName: foreign.fileName,
            sizeBytes: foreign.sizeBytes,
          },
        ],
        retryToken: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(
      await prisma.inboxMessage.count({
        where: { conversationId: conversation.id },
      }),
    ).toBe(before);
  });

  it('serializes concurrent reply retries into one canonical message and event', async () => {
    const conversation = await createConversation({
      employeeId: actorId,
      teamId: teamA,
      unread: 3,
    });
    const retryToken = randomUUID();
    const command = { body: 'concurrent reply', attachments: [], retryToken };
    const [first, second] = await Promise.all([
      service.sendReply(caller(), conversation.id, command),
      service.sendReply(caller(), conversation.id, command),
    ]);
    expect(first.version).toBe(second.version);
    expect(
      await prisma.inboxMessage.count({
        where: { conversationId: conversation.id, retryToken },
      }),
    ).toBe(1);
    expect(
      await prisma.inboxSystemEvent.count({
        where: { conversationId: conversation.id, type: 'reply.sent' },
      }),
    ).toBe(1);
    const version = (
      await prisma.inboxConversation.findUniqueOrThrow({
        where: { id: conversation.id },
      })
    ).version;
    await service.sendReply(caller(), conversation.id, command);
    expect(
      (
        await prisma.inboxConversation.findUniqueOrThrow({
          where: { id: conversation.id },
        })
      ).version,
    ).toBe(version);
  });

  it('enforces assignment permissions, active compatibility, and atomic history', async () => {
    const conversation = await createConversation({});
    const before = await prisma.inboxSystemEvent.count({
      where: { conversationId: conversation.id },
    });
    await expect(
      service.assign(caller(['inbox.view.all']), conversation.id, {
        employeeId: otherId,
        teamId: teamA,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      await prisma.inboxSystemEvent.count({
        where: { conversationId: conversation.id },
      }),
    ).toBe(before);
    await expect(
      service.assign(
        caller([
          'inbox.view.all',
          'inbox.assign.employee',
          'inbox.assign.team',
        ]),
        conversation.id,
        { employeeId: actorId, teamId: teamB },
      ),
    ).rejects.toMatchObject({ status: 422 });
    await service.assign(caller(), conversation.id, {
      employeeId: otherId,
      teamId: teamA,
    });
    expect(
      await prisma.inboxAssignmentHistory.count({
        where: { conversationId: conversation.id },
      }),
    ).toBe(1);
    expect(
      await prisma.inboxSystemEvent.count({
        where: { conversationId: conversation.id, type: 'assignment.changed' },
      }),
    ).toBe(1);
    const stable = await prisma.inboxConversation.findUniqueOrThrow({
      where: { id: conversation.id },
    });
    await service.assign(caller(), conversation.id, {
      employeeId: otherId,
      teamId: teamA,
    });
    expect(
      (
        await prisma.inboxConversation.findUniqueOrThrow({
          where: { id: conversation.id },
        })
      ).version,
    ).toBe(stable.version);
  });

  it('applies status, tag, archive, restore, and delete lifecycle without no-op writes', async () => {
    const conversation = await createConversation({
      employeeId: actorId,
      teamId: teamA,
    });
    const initial = await service.changeStatus(
      caller(),
      conversation.id,
      'open',
    );
    expect(initial.version).toBe(conversation.version);
    const pending = await service.changeStatus(
      caller(),
      conversation.id,
      'pending',
    );
    const tagged = await service.toggleTag(caller(), conversation.id, tagId);
    expect(tagged.tagIds).toContain(tagId);
    const archived = await service.archive(caller(), conversation.id);
    const archivedAgain = await service.archive(caller(), conversation.id);
    expect(archivedAgain.version).toBe(archived.version);
    await expect(
      service.changeStatus(caller(), conversation.id, 'open'),
    ).rejects.toMatchObject({ status: 409 });
    const restored = await service.restore(caller(), conversation.id);
    expect(restored.status).toBe('pending');
    expect(restored.version).toBeGreaterThan(pending.version);
    await service.delete(caller(), conversation.id);
    await expect(
      service.detail(caller(), conversation.id),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      (await service.restore(caller(), conversation.id)).deletedAt,
    ).toBeUndefined();
  });

  it('requires note permission and author ownership with denied no-write guarantees', async () => {
    const conversation = await createConversation({
      employeeId: actorId,
      teamId: teamA,
    });
    await expect(
      service.addNote(caller(['inbox.view.all']), conversation.id, 'denied'),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      await prisma.inboxInternalNote.count({
        where: { conversationId: conversation.id },
      }),
    ).toBe(0);
    const note = await service.addNote(caller(), conversation.id, 'owned');
    const foreignCaller = caller(permissions, {
      accountId: otherId,
      displayName: 'Other',
      organizationWide: true,
    });
    await expect(
      service.editNote(foreignCaller, conversation.id, note.id, 'no'),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.deleteNote(foreignCaller, conversation.id, note.id),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      (
        await prisma.inboxInternalNote.findUniqueOrThrow({
          where: { id: note.id },
        })
      ).content,
    ).toBe('owned');
    await service.editNote(caller(), conversation.id, note.id, 'updated');
    await service.deleteNote(caller(), conversation.id, note.id);
    expect(
      await prisma.inboxInternalNote.count({ where: { id: note.id } }),
    ).toBe(0);
  });

  it('constrains lookup teams, employees, and memberships to the organization and branch scope', async () => {
    const otherOrganization = await prisma.organization.create({
      data: {
        singletonKey: randomUUID(),
        code: `other-${randomUUID()}`,
        name: 'Other Org',
        workingHours: {},
      },
    });
    ownedOrganizationIds.push(otherOrganization.id);
    const foreignEmployee = await prisma.account.create({
      data: {
        email: `foreign-${randomUUID()}@test.invalid`,
        passwordHash: 'not-authenticatable',
        displayName: 'Foreign Employee',
        normalizedDisplayName: 'foreign employee',
        branchIds: [branchB],
        status: 'ACTIVE',
      },
    });
    ownedAccountIds.push(foreignEmployee.id);
    const foreignTeam = await prisma.ticketTeam.create({
      data: { organizationId: otherOrganization.id, name: 'Foreign Team' },
    });
    ownedTeamIds.push(foreignTeam.id);
    await prisma.ticketTeamMembership.create({
      data: { teamId: foreignTeam.id, employeeId: foreignEmployee.id },
    });
    const result = await service.lookups(caller(['inbox.view.all']));
    expect(result.teams.map((x) => x.id)).not.toContain(foreignTeam.id);
    expect(result.employees.map((x) => x.id)).not.toContain(foreignEmployee.id);
    expect(result.employees.flatMap((x) => x.teamIds)).not.toContain(
      foreignTeam.id,
    );
  });
});
