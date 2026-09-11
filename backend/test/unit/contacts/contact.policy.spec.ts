import { ContactPolicy } from '../../../src/modules/contacts/contact.policy';
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

describe('ContactPolicy', () => {
  const policy = new ContactPolicy();

  it('requires contacts.view before any listing', () => {
    expect(() => policy.scope(caller([]))).toThrow(/صلاحية/);
    expect(policy.scope(caller(['contacts.view']))).toEqual({});
  });
});
