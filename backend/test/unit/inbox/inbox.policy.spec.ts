import { InboxPolicy } from '../../../src/modules/inbox/inbox.policy';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller = (
  permissionKeys: string[],
  overrides: Partial<CallerContext> = {},
): CallerContext => ({
  accountId: '00000000-0000-4000-8000-000000000001',
  displayName: 'Actor',
  email: 'a@example.com',
  sessionId: 'session',
  roles: [],
  permissionKeys,
  authorizedBranchIds: ['00000000-0000-4000-8000-000000000010'],
  organizationWide: false,
  authenticatedAt: new Date(0).toISOString(),
  ...overrides,
});

describe('InboxPolicy', () => {
  const policy = new InboxPolicy();
  const clauses = (value: ReturnType<InboxPolicy['scope']>) =>
    Array.isArray(value.AND) ? value.AND : [];
  it('uses all > team > assigned precedence', () => {
    expect(
      policy.scope(
        caller(['inbox.view.all', 'inbox.view.team', 'inbox.view.assigned']),
        ['team-1'],
      ),
    ).toEqual({
      AND: [
        {},
        {
          customer: {
            branchId: { in: ['00000000-0000-4000-8000-000000000010'] },
          },
        },
      ],
    });
    expect(
      clauses(
        policy.scope(caller(['inbox.view.team', 'inbox.view.assigned']), [
          'team-1',
        ]),
      )[0],
    ).toEqual({ assignedTeamId: { in: ['team-1'] } });
    expect(
      clauses(policy.scope(caller(['inbox.view.assigned']), []))[0],
    ).toEqual({
      assignedEmployeeId: '00000000-0000-4000-8000-000000000001',
    });
  });
  it('always intersects visibility with branch scope', () => {
    expect(clauses(policy.scope(caller(['inbox.view.all']), []))[1]).toEqual({
      customer: { branchId: { in: ['00000000-0000-4000-8000-000000000010'] } },
    });
    expect(
      clauses(
        policy.scope(
          caller(['inbox.view.all'], { organizationWide: true }),
          [],
        ),
      )[1],
    ).toEqual({});
  });
  it('forbids actors without a view permission', () => {
    expect(() => policy.scope(caller([]), [])).toThrow();
  });
});
