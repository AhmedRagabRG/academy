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
  organizationWide: false,
  branchIds: [],
  authenticatedAt: new Date(0).toISOString(),
  ...overrides,
});

describe('InboxPolicy', () => {
  const policy = new InboxPolicy();
  it('uses all > team > assigned precedence', () => {
    expect(
      policy.scope(
        caller(['inbox.view.all', 'inbox.view.team', 'inbox.view.assigned']),
        ['team-1'],
      ),
    ).toEqual({});
    expect(
      policy.scope(caller(['inbox.view.team', 'inbox.view.assigned']), [
        'team-1',
      ]),
    ).toEqual({ assignedTeamId: { in: ['team-1'] } });
    expect(policy.scope(caller(['inbox.view.assigned']), [])).toEqual({
      assignedEmployeeId: '00000000-0000-4000-8000-000000000001',
    });
  });
  it('forbids actors without a view permission', () => {
    expect(() => policy.scope(caller([]), [])).toThrow();
  });
});
