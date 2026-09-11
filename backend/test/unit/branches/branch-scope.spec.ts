import {
  branchFilter,
  branchWhere,
} from '../../../src/core/authorization/branch-scope';
import { TicketPolicy } from '../../../src/modules/tickets/ticket.policy';
import { ContactPolicy } from '../../../src/modules/contacts/contact.policy';
import { InboxPolicy } from '../../../src/modules/inbox/inbox.policy';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller = (overrides: Partial<CallerContext> = {}): CallerContext => ({
  accountId: 'acc-1',
  displayName: 'موظف',
  email: 'a@b.c',
  sessionId: 's',
  roles: [],
  permissionKeys: [],
  organizationWide: false,
  branchIds: [],
  authenticatedAt: '',
  ...overrides,
});

/**
 * Branch is an access-control boundary, so the cost of getting these wrong is
 * asymmetric: too narrow silently hides a user's own data, too wide leaks
 * another branch's. Both directions are asserted.
 */
describe('branch visibility rule', () => {
  it('does not restrict an account with no branches', () => {
    // Every account predating branches has an empty array. If this ever starts
    // meaning "no access", the whole application empties for existing users.
    expect(branchFilter(caller())).toBeNull();
    expect(branchWhere(caller(), 'branchId')).toEqual({});
  });

  it('does not restrict an organization-wide account', () => {
    expect(
      branchFilter(caller({ organizationWide: true, branchIds: ['b1'] })),
    ).toBeNull();
  });

  it('restricts an account that has branches', () => {
    expect(branchFilter(caller({ branchIds: ['b1', 'b2'] }))).toEqual({
      in: ['b1', 'b2'],
    });
  });

  it('keeps unassigned rows visible to a restricted account', () => {
    // Every row predating branches has a null branchId.
    expect(branchWhere(caller({ branchIds: ['b1'] }), 'branchId')).toEqual({
      OR: [{ branchId: { in: ['b1'] } }, { branchId: null }],
    });
  });
});

describe('TicketPolicy branch scoping', () => {
  const policy = new TicketPolicy();

  it('narrows view.all rather than bypassing branches', () => {
    const scope = policy.scope(
      caller({ permissionKeys: ['tickets.view.all'], branchIds: ['b1'] }),
      [],
    );
    // view.all must mean "all tickets in my branches", never "all tickets".
    expect(JSON.stringify(scope)).toContain('b1');
  });

  it('leaves an unrestricted caller scope byte-identical to before branches', () => {
    // Adding branches must be a no-op for every account that has none.
    const scope = policy.scope(
      caller({ permissionKeys: ['tickets.view.all'] }),
      [],
    );
    expect(scope).toEqual({});
  });

  it('still denies a caller with no view permission', () => {
    const scope = policy.scope(caller({ branchIds: ['b1'] }), []);
    expect(JSON.stringify(scope)).toContain('__none__');
  });
});

describe('ContactPolicy branch scoping', () => {
  const policy = new ContactPolicy();

  it('restricts contacts to the caller branches', () => {
    const scope = policy.scope(
      caller({ permissionKeys: ['contacts.view'], branchIds: ['b1'] }),
    );
    expect(scope).toEqual({
      OR: [{ branchId: { in: ['b1'] } }, { branchId: null }],
    });
  });

  it('returns an unrestricted scope when the caller has no branches', () => {
    expect(policy.scope(caller({ permissionKeys: ['contacts.view'] }))).toEqual(
      {},
    );
  });
});

describe('InboxPolicy branch scoping', () => {
  const policy = new InboxPolicy();

  it('scopes conversations through the contact behind them', () => {
    const scope = policy.scope(
      caller({ permissionKeys: ['inbox.view.all'], branchIds: ['b1'] }),
      [],
    );
    const json = JSON.stringify(scope);
    expect(json).toContain('b1');
    // A conversation with no contact yet must stay visible, or a brand new
    // WhatsApp message would be invisible to the very people who handle it.
    expect(json).toContain('contactId');
  });

  it('leaves an unrestricted caller alone', () => {
    expect(
      policy.scope(caller({ permissionKeys: ['inbox.view.all'] }), []),
    ).toEqual({});
  });
});
