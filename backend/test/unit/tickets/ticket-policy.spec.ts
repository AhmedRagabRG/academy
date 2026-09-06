import {
  ForbiddenException,
  NotFoundException,
} from '../../../src/core/exceptions';
import type { CallerContext } from '../../../src/shared/types/caller-context';
import { TicketPolicy } from '../../../src/modules/tickets/ticket.policy';

const caller = (permissionKeys: string[]): CallerContext => ({
  accountId: '00000000-0000-4000-8000-000000000001',
  displayName: 'Agent',
  email: 'agent@example.test',
  sessionId: 'session',
  roles: [],
  permissionKeys,
  organizationWide: false,
  authenticatedAt: new Date(0).toISOString(),
});

describe('TicketPolicy', () => {
  const policy = new TicketPolicy();

  it('applies all over team and assigned visibility', () => {
    expect(
      policy.scope(
        caller([
          'tickets.view.assigned',
          'tickets.view.team',
          'tickets.view.all',
        ]),
        ['team-1'],
      ),
    ).toEqual({});
  });

  it('applies team over assigned visibility', () => {
    expect(
      policy.scope(caller(['tickets.view.assigned', 'tickets.view.team']), [
        'team-1',
      ]),
    ).toEqual({ teamId: { in: ['team-1'] } });
  });

  it('limits assigned visibility to the authenticated account', () => {
    expect(policy.scope(caller(['tickets.view.assigned']), [])).toEqual({
      employeeId: '00000000-0000-4000-8000-000000000001',
    });
  });

  it('rejects callers without a view permission', () => {
    expect(() => policy.assertAnyView(caller([]))).toThrow(ForbiddenException);
  });

  it('uses not-found for out-of-scope non-disclosure', () => {
    expect(() => policy.assertVisible(false)).toThrow(NotFoundException);
  });
});
