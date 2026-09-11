import { TicketService } from '../../../src/modules/tickets/ticket.service';
import { TicketPolicy } from '../../../src/modules/tickets/ticket.policy';
import { InboxService } from '../../../src/modules/inbox/inbox.service';
import { InboxPolicy } from '../../../src/modules/inbox/inbox.policy';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller = (overrides: Partial<CallerContext> = {}): CallerContext => ({
  accountId: 'acc-1',
  displayName: 'موظف',
  email: 'a@b.c',
  sessionId: 's',
  roles: [],
  permissionKeys: ['tickets.view.all', 'inbox.view.all'],
  organizationWide: true,
  branchIds: [],
  authenticatedAt: '',
  ...overrides,
});

/**
 * The assignment dropdowns narrow themselves by branch so that nobody is
 * offered a colleague who would not be able to see the row once assigned. That
 * filter is client-side and purely a usability guard — authorization stays in
 * TicketPolicy.scope / InboxPolicy.scope — but it is dead unless these
 * projections actually carry the two fields it reads: the employee's branches
 * and the row's branch.
 */
describe('ticket configuration carries branch data for assignment', () => {
  const build = () => {
    const accounts = [
      { id: 'emp-cairo', displayName: 'أحمد', branchIds: ['b-cairo'] },
      { id: 'emp-free', displayName: 'عمر', branchIds: [] },
    ];
    const db = {
      ticket: {
        findMany: jest.fn().mockResolvedValue([
          {
            teamId: null,
            employeeId: 'emp-cairo',
            customerId: null,
            studentId: null,
            tags: [],
          },
          {
            teamId: null,
            employeeId: 'emp-free',
            customerId: null,
            studentId: null,
            tags: [],
          },
        ]),
      },
      ticketTeam: { findMany: jest.fn().mockResolvedValue([]) },
      account: {
        findMany: jest.fn<
          Promise<unknown>,
          [{ select: Record<string, boolean> }]
        >(() => Promise.resolve(accounts)),
      },
      ticketTeamMembership: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const repo = {
      db,
      organizationId: jest.fn().mockResolvedValue('org-1'),
      scopedWhere: jest.fn().mockResolvedValue({}),
    };
    const config = { getOrThrow: jest.fn().mockReturnValue(1024) };
    const service = new TicketService(
      repo as never,
      new TicketPolicy(),
      {} as never,
      config as never,
    );
    return { service, db };
  };

  it('projects each employee with their branches', async () => {
    const { service } = build();
    const result = await service.configuration(caller());
    expect(result.employees).toEqual([
      expect.objectContaining({ id: 'emp-cairo', branchIds: ['b-cairo'] }),
      // An empty array must survive the projection rather than being dropped:
      // it is what marks an unrestricted employee, who stays assignable
      // everywhere. Absent would read the same, but only by accident.
      expect.objectContaining({ id: 'emp-free', branchIds: [] }),
    ]);
  });

  it('asks the database for branchIds at all', async () => {
    // Selecting the column is the easy half to lose in a refactor, and losing
    // it silently turns every employee into "unrestricted" in the dropdown.
    const { service, db } = build();
    await service.configuration(caller());
    expect(db.account.findMany.mock.calls[0]?.[0].select.branchIds).toBe(true);
  });
});

describe('inbox lookups carry branch data for assignment', () => {
  const build = () => {
    const db = {
      inboxPlatform: { findMany: jest.fn().mockResolvedValue([]) },
      inboxTag: { findMany: jest.fn().mockResolvedValue([]) },
      ticketTeam: { findMany: jest.fn().mockResolvedValue([]) },
      account: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'emp-giza', displayName: 'سارة', branchIds: ['b-giza'] },
          { id: 'emp-free', displayName: 'عمر', branchIds: [] },
        ]),
      },
      ticketTeamMembership: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const repo = { db, organizationId: jest.fn().mockResolvedValue('org-1') };
    const service = new InboxService(
      repo as never,
      new InboxPolicy(),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service };
  };

  it('projects each employee with their branches', async () => {
    const { service } = build();
    const result = await service.lookups(caller());
    expect(result.employees).toEqual([
      expect.objectContaining({ id: 'emp-giza', branchIds: ['b-giza'] }),
      expect.objectContaining({ id: 'emp-free', branchIds: [] }),
    ]);
  });
});

/**
 * A conversation has no branch column: it arrives on a channel rather than at
 * a location, so it inherits one from the contact behind its customer, exactly
 * as InboxPolicy.scope does when deciding visibility. If the projection and
 * the policy ever disagree about where that branch comes from, the dropdown
 * filters against one branch while the server scopes against another.
 */
describe('conversation branch inheritance', () => {
  const project = (contact: { branchId: string | null } | null) => {
    const service = new InboxService(
      { db: {} } as never,
      new InboxPolicy(),
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const row = {
      id: 'c-1',
      customerId: 'cust-1',
      platformId: 'p-1',
      status: 'OPEN',
      assignedEmployeeId: null,
      assignedTeamId: null,
      tags: [],
      unreadCount: 0,
      lastMessage: '',
      lastActivityAt: new Date(),
      version: 1,
      deletedAt: null,
      previousStatus: null,
      aiState: null,
      customer: {
        id: 'cust-1',
        name: 'عميل',
        phone: '0100',
        avatarUrl: null,
        firstContactAt: new Date(),
        lastActivityAt: new Date(),
        contact,
      },
      platform: { id: 'p-1', label: 'واتساب', icon: 'i', active: true },
      assignedEmployee: null,
      assignedTeam: null,
      messages: [],
      notes: [],
      assignmentHistory: [],
      systemEvents: [],
    };
    return (
      service as unknown as { project: (r: unknown) => { branchId: unknown } }
    ).project(row);
  };

  it('takes the branch from the contact behind the customer', () => {
    expect(project({ branchId: 'b-cairo' }).branchId).toBe('b-cairo');
  });

  it('reports no branch when the contact has none', () => {
    expect(project({ branchId: null }).branchId).toBeNull();
  });

  it('reports no branch when the customer has no contact yet', () => {
    // A brand new WhatsApp message has no contact. "No branch" here has to
    // mean visible-and-assignable to everyone, never assignable to nobody.
    expect(project(null).branchId).toBeNull();
  });
});
